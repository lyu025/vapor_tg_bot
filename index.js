require('dotenv').config();

const TgBot=require('node-telegram-bot-api');
const cheerio=require('cheerio');
const cron=require('node-cron');
const fs=require('fs').promises;
const axios=require('axios');
const path=require('path');

const CC={
	CR_TIME:process.env.CR_TIME||'*/30 * * * * *',
	TG_TOKEN:process.env.TG_TOKEN,
	PORT:process.env.PORT||3000
},NM={},GM={};

const n_list=async()=>{
	const x=await axios.get('https://www.flw.ph/forum.php?mod=forumdisplay&fid=40&filter=lastpost&orderby=dateline&mobile=2',{timeout:15000});
	const $=cheerio.load(x.data),o=[];
	$('#threadlist>li').each((i,e)=>{
		const $e=$(e);
		const id=$e.attr('id').split('_').pop();
		const time=$e.find('.time').text().trim();
		const title=$e.find('.c h3').html().split('<').shift().trim();
		const brief=$e.find('.art-title').text().replace(/[\r\n\s]/g,'').replace(/^(【[^】]+】|[^：]+报：) */,'');
		const ii=$e.find('.piclist img'),img=ii.length>0?ii.attr('src'):null;
		if(!id||!title)return;
		NM[id]={id,title,time,brief,img,info:'',ts:new Date().toISOString()}
		o.push(NM[id]);
	});
	return o;
};
const n_info=async(id)=>{
	const x=await axios.get(`https://www.flw.ph/forum.php?mod=viewthread&tid=${id}&mobile=2`,{timeout:10000});
	let $=cheerio.load(x.data),o='';
	const walk=nodes=>{
		nodes.each((i,node)=>{
			if(node.type==='text'){
				const text=$(node).text().trim();
				if(text)o+='\n    '+text;
			}else if(node.type==='tag'){
				const el=$(node);
				if(el.is('br')){}else if(el.is('strong')){
					o+=`\n**${el.text().trim()}**`;
				}else{
					walk(el.contents());
				}
			}
		});
	};
	walk($('.message').contents());
	return o.trim();
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));


if(!CC.TG_TOKEN)throw new Error('请在.env文件中设置TG_TOKEN');
const BT=new TgBot(CC.TG_TOKEN,{
	polling:{
		autoStart:true,interval:1000, // 增加间隔
		params:{
			timeout:30,offset:-1 // 关键：从最新消息开始
		}
	}
});

//错误处理
BT.on('polling_error',e=>{
	if(!e.message.includes('409'))return;
	BT.stopPolling();
	setTimeout(()=>BT.startPolling(),3000);
});

//入群
BT.on('new_chat_members',async m=>{
	const ms=m.new_chat_members,me=await BT.getMe();
	const id=m.chat.id,type=m.chat.type,title=m.chat.title||'未命名群组';
	if(!ms.some(m=>m.id===me.id)||type==='private')return;
	GM[id]={id,type,title};
	await BT.sendMessage(id,`🤖 机器人已加入！`,{
		parse_mode:'HTML',disable_web_page_preview:true
	});
});
//退群
BT.on('left_chat_member',async m=>{
	const me=await BT.getMe(),id=m.chat.id;
	if(m.left_chat_member.id===me.id&&(id in GM))delete GM[id];
});
//获取资讯详情
BT.on('callback_query',async q=>{
	const {id,data,message:m}=q;
	try{
		if(data.startsWith('expand_')){
			const id=data.replace('expand_','');
			const n=NM[id],info=await n_info(id);
			const chat_id=m.chat.id,message_id=m.message_id;
			const caption=`*${n.title}*\n\n_发布时间: ${n.time}_\n\n`;
			await BT['editMessage'+(m.text?'Text':'Caption')](caption+info,{
				chat_id,message_id,parse_mode:'Markdown'
			});
		}
		await BT.answerCallbackQuery(id);
	}catch(e){
		await BT.answerCallbackQuery(id,{
			text:e.message,show_alert:false
		});
	}
});

//单发
const send=async(id,n)=>{
	try{
		const caption=`*${n.title}*\n\n\`${n.brief}\`\n\n_发布时间: ${n.time}_\n\n`;
		const reply_markup={
			inline_keyboard:[
				[{text:'📖 展开详情',callback_data:`expand_${n.id}`}]
			]
		};
		if(!n.img)await BT.sendMessage(id,caption,{
			parse_mode:'Markdown',reply_markup,
			disable_web_page_preview:true
		});
		else await BT.sendPhoto(id,n.img,{
			caption,parse_mode:'Markdown',reply_markup,
			disable_web_page_preview:true
		});
		return true;
	}catch(e){
		return false;
	}
};
//手动获取最新资讯
BT.onText(/\/news/,async m=>{
	const id=m.chat.id;
	const s=(await n_list()).slice(0,5);
	for(const n of s)await send(id,n);
});


//群发
let wait=false,SM={};
const bsend=async()=>{
	if(wait)return;
	if(Object.keys(GM).length==0)return;
	try{
		const s=await n_list().filter(_=>!NM[_.id]).slice(0,10);
		if(s.length===0)return;
		wait=true;
		for(const g of GM){
			for(const n of s){
				const k=g.id+'_'+n.id;
				if(k in SM)continue;
				const ok=await send(g.id,n);
				if(ok)SM[k]=1;
				await sleep(500);
			}
			await sleep(100);
		}
	}catch(e){
		console.error('❌ 推送失败:',e);
	}finally{
		wait=false;
	}
};
const task=cron.schedule(CC.CR_TIME,()=>bsend(),{scheduled:true,timezone:'Asia/Shanghai'});
setTimeout(()=>bsend(),5000);
task.start();

const http=require('http');
const server=http.createServer((req,res)=>{
	res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
	res.end(`...`);
});
server.listen(CC.PORT,()=>{
	console.log(`🌐 Web服务器运行在: http://localhost:${CC.PORT}`);
});

//全局错误处理
process.on('uncaughtException',e=>{
	console.error('💥 未捕获异常:',e);
});
process.on('unhandledRejection',(reason,promise)=>{
	console.error('💥 未处理的Promise拒绝:',reason);
});