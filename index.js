require('dotenv').config();

const TgBot=require('node-telegram-bot-api');
const cheerio=require('cheerio');
const cron=require('node-cron');
const fs=require('fs').promises;
const axios=require('axios');
const path=require('path');

//配置
const CC={
	CR_TIME:process.env.CR_TIME||'* * * * *',
	TG_TOKEN:process.env.TG_TOKEN,
	PORT:process.env.PORT||3000
};

//存储管理器
class SM{
	constructor(){
		this.news=new Map();
		this.groups=new Map();
	}
	g_add(id,title,type){
		this.groups.set(id,{
			id,type,title:title||'未命名群组',
			jtime:new Date().toISOString(),active:true
		});
	}
	g_del(id){
		this.groups.delete(id);
	}
	g_aget(){
		return Array.from(this.groups.values()).filter(g=>g.active&&g.type!=='private');
	}
	n_get(id){
		return this.news.get(id);
	}
	n_set(id,o,is_detail=false){
		if(id=='_'){
			const x=this.n_get(id)||{};
			if(o in x)return;
			x[o]=1;
			this.news.set(id,x);
			return;
		}
		if(!is_detail){
			this.news.set(id,o);
			return;
		}
		const x=this.n_get(id);
		if(!x)return;
		x.info=o;
		this.news.set(id,x);
	}
}

//新闻抓取器（支持获取详情）
class NF{
	async list(im={}){
		try{
			const x=await axios.get('https://www.flw.ph/forum.php?mod=forumdisplay&fid=40&filter=lastpost&orderby=dateline&mobile=2',{timeout:15000});
			const $=cheerio.load(x.data),o=[];
			$('#threadlist>li').each((i,e)=>{
				const $e=$(e);
				const id=$e.attr('id').split('_').pop();
				const time=$e.find('.time').text().trim();
				const title=$e.find('.c h3').html().split('<').shift().trim();
				const brief=$e.find('.art-title').text().replace(/[\r\n\s]/g,'').replace(/^(【[^】]+】|[^：]+报：) */,'');
				const ii=$e.find('.piclist img'),img=ii.length>0?ii.attr('src'):null;
				if(!id||!title||(id in im))return
				o.push({id,title,time,brief,img,info:'',ts:new Date().toISOString()});
			});
			return o;
		}catch(e){
			console.error('❌ 抓取失败:',e.message);
			return[];
		}
	}
	async info(id){
		try{
			const x=await axios.get(`https://www.flw.ph/forum.php?mod=viewthread&tid=${id}&mobile=2`,{timeout:10000});
			let $=cheerio.load(x.data),o='';
			const walk=nodes=>{
				nodes.each((i,node)=>{
					if(node.type==='text'){
						const text=$(node).text().trim();
						if(text)o+='\n  '+text;
					}else if(node.type==='tag'){
						const el=$(node);
						if(el.is('br')){}else if(el.is('strong')){
							o+=`\n**${el.text().trim()}**`;
						}else if(el.is('img')){
							const src='https://www.flw.ph/forum.php'+el.attr('src').replace('forum.php','');
							const alt=el.attr('alt')||'';
							if(src)o+=`\n![${alt}](${src})`;
						}else{
							walk(el.contents());
						}
					}
				});
			};
			walk($('.message').contents());
			return o.trim();
		}catch(e){
			console.log(`⚠️	获取详情失败:${e.message}`);
			return '...';
		}
	}
	sleep(ms){
		return new Promise(r=>setTimeout(r,ms));
	}
}

//Telegram机器人
class Bot{
	constructor(){
		if(!CC.TG_TOKEN)throw new Error('请在.env文件中设置TG_TOKEN');
		this.bot=new TgBot(CC.TG_TOKEN,{
			polling:{
				autoStart:true,
				interval:1000, // 增加间隔
				params:{
					timeout:30,
					offset:-1 // 关键：从最新消息开始
				}
			}
		});
		this.sm=new SM();
		this.nf=new NF();
		this.me=null;
		this._=false;
	}
	async _me(){
		if(!this.me)this.me=await this.bot.getMe();
		return this.me;
	}
	async start(){
		this.me=await this.bot.getMe();
		this.listen();
		this.crontab();
		this.wserver();
	}
	listen(){
		//错误处理
		this.bot.on('polling_error',e=>{
			if(e.message.includes('409')){
				console.log('检测到冲突，等待后继续...');
				this.bot.stopPolling();
				setTimeout(()=>this.bot.startPolling(),5000);
			}
		});
		//机器人加入群组
		this.bot.on('new_chat_members',async(msg)=>{
			const ms=msg.new_chat_members;
			const me=await this._me();
			const o=ms.some(m=>m.id===me.id);
			if(o)await this.g_join(msg);
		});
		//机器人被移除
		this.bot.on('left_chat_member',async(msg)=>{
			const me=await this._me();
			if(msg.left_chat_member.id===me.id)await this.g_out(msg);
		});
		//回调查询处理
		this.bot.on('callback_query',async q=>await this.cq(q));
		//命令处理
		this.bot.onText(/\/news/,(msg)=>this.todo(msg,'news'));
		this.bot.onText(/\/start/,(msg)=>this.todo(msg,'start'));
		this.bot.onText(/\/help/,(msg)=>this.todo(msg,'help'));
	}
	async g_join(msg){
		const id=msg.chat.id,type=msg.chat.type;
		const title=msg.chat.title||'未命名群组';
		this.sm.g_add(id,title,type);
		if(type=='private')return;
		const welcome=`🤖*机器人已加入！*`;
		await this.bot.sendMessage(id,welcome,{
			parse_mode:'Markdown',
			disable_web_page_preview:true
		});
	}
	async g_out(msg){
		this.sm.g_del(msg.chat.id);
	}
	async cq(_){
		const {id,data}=_;
		try{
			if(data.startsWith('expand_'))await this.expand(_);
			//确认回调已处理
			await this.bot.answerCallbackQuery(id);
		}catch(e){
			await this.bot.answerCallbackQuery(id,{
				text:e.message,
				show_alert:false
			});
		}
	}
	async expand(_){
		const {data,message}=_;
		const id=data.replace('expand_','');
		const cid=message.chat.id,mid=message.message_id;
		const detail=await this.nf.info(id);
		await this.bot['editMessage'+(message.text?'Text':'Caption')]((message.text?message.text:message.caption)+'\n\n'+detail,{
			chat_id:cid,message_id:mid,parse_mode:'Markdown'
		});
	}
	async todo(msg,command){
		const id=msg.chat.id,type=msg.chat.type;
		switch(command){
			case'start':
				break;
			case'news':
				await this.onews(id);
				break;
			case'help':
				await this.bot.sendMessage(id,
					`📖*可用命令:*\n`+
					`/start-开始使用\n`+
					`/news-手动获取最新新闻\n`,
					{
						parse_mode:'Markdown',
						disable_web_page_preview:true
					}
				);
				break;
		}
	}
	async onews(id){
		try{
			const s=(await this.nf.list()).slice(0,6);
			for(const n of s)await this.send(id,n);
		}catch(e){
			console.error('❌ 发送新闻失败:',e);
		}
	}
	async send(id,news){
		try{
			const caption=`*${news.title}*\n\n\`${news.brief}\`\n\n_发布时间: ${news.time}_\n\n`;
			const reply_markup={
				inline_keyboard:[
					[{text:'📖 展开详情',callback_data:`expand_${news.id}`}]
				]
			};
			if(!news.img)await this.bot.sendMessage(id,caption,{
				parse_mode:'Markdown',reply_markup,
				disable_web_page_preview:true
			});
			else await this.bot.sendPhoto(id,news.img,{
				caption,parse_mode:'Markdown',reply_markup,
				disable_web_page_preview:true
			});
			return true;
		}catch(e){
			console.error(`❌ 发送失败到 ${id}:`,e.message);
			return false;
		}
	}
	//发送新闻到所有群组
	async bnews(){
		if(this._)return;
		this._=true;
		const groups=this.sm.g_aget();
		if(groups.length===0){
			this._=false;
			return;
		}
		try{
			//获取新闻
			const im=this.sm.n_get('_')||{},s=await this.nf.list(im).slice(0,10);
			if(s.length===0){
				this._=false;
				return;
			}
			//向每个群组发送新闻
			for(const g of groups){
				for(const n of s){
					const ok=await this.send(g.id,n);
					if(ok)this.sm.n_set('_',n.id);
					await this.sleep(500);
				}
				await this.sleep(100);
			}
		}catch(e){
			console.error('❌ 推送失败:',e);
		}finally{
			this._=false;
		}
	}
	//启动定时任务
	crontab(){
		cron.schedule(CC.CR_TIME,()=>this.bnews(),{scheduled:true,timezone:'Asia/Shanghai'});
		setTimeout(()=>this.bnews(),10000);
	}
	//启动Web服务器
	wserver(){
		const http=require('http');
		const server=http.createServer((req,res)=>{
			const groups=this.sm.g_aget();
			if(req.url==='/health'){
				res.writeHead(200,{'Content-Type':'application/json'});
				res.end(JSON.stringify({
					status:'healthy',
					bot:`@${this.me?.username||'unknown'}`,
					groups:groups.length,
					cache:this.sm.news.size,
					uptime:Math.floor(process.uptime())
				},null,2));
			}else if(req.url==='/stats'){
				res.writeHead(200,{'Content-Type':'application/json'});
				res.end(JSON.stringify({
					active_groups:groups.length,
					cached_news:this.sm.news.size,
					sent_news:this.sm.sentNews.size,
					last_update:new Date().toISOString()
				},null,2));
			}else{
				res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
				res.end(`...`);
			}
		});
		server.listen(CC.PORT,()=>{
			console.log(`🌐 Web服务器运行在:http://localhost:${CC.PORT}`);
		});
	}
	sleep(ms){
		return new Promise(resolve=>setTimeout(resolve,ms));
	}
}

//启动程序
async function main(){
	try{
		const bot=new Bot();
		await bot.start();
	}catch(e){
		console.error('💥 启动失败:',e);
		process.exit(1);
	}
}

//全局错误处理
process.on('uncaughtException',e=>{
	console.error('💥 未捕获异常:',e);
});
process.on('unhandledRejection',(reason,promise)=>{
	console.error('💥 未处理的Promise拒绝:',reason);
});

//启动
main();