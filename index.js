require('dotenv').config();

const TelegramBot=require('node-telegram-bot-api');
const axios=require('axios');
const cheerio=require('cheerio');
const cron=require('node-cron');
const fs=require('fs').promises;
const path=require('path');

//配置
const CONFIG={
	TELEGRAM_TOKEN:process.env.TELEGRAM_BOT_TOKEN,
	SCHEDULE_TIME:process.env.SCHEDULE_TIME||'*/3****',
	PORT:process.env.PORT||3000
};

//存储管理器
class StorageManager{
	constructor(){
		this.cacheFile=path.join(__dirname,'news_cache.json');
		this.groups=new Map();//内存存储群组
		this.newsCache=new Map();//新闻详情缓存
		this.sentNews=new Set();
	}
	async init(){
		await this.loadCache();
		console.log('📊 存储管理器初始化完成');
	}
	async loadCache(){
		try{
			const data=await fs.readFile(this.cacheFile,'utf8');
			const cache=JSON.parse(data);
			this.sentNews=new Set(cache.sentNews||[]);
			this.newsCache=new Map(Object.entries(cache.newsCache||{}));
			console.log(`📁 加载缓存: ${this.sentNews.size} 条已发送新闻`);
		}catch(error){
			console.log('📁 创建新缓存文件');
			await this.saveCache();
		}
	}
	async saveCache(){
		const cache={
			sentNews:Array.from(this.sentNews),
			newsCache:Object.fromEntries(this.newsCache),
			updated:new Date().toISOString()
		};
		await fs.writeFile(this.cacheFile,JSON.stringify(cache,null,2),'utf8');
	}
	//群组管理
	addGroup(chatId,title,type){
		this.groups.set(chatId,{
			id:chatId,type:type,
			title:title||'未命名群组',
			joinedAt:new Date().toISOString(),
			active:true
		});
		console.log(`👥 添加群组:${title}(${chatId})`);
	}
	removeGroup(chatId){
		this.groups.delete(chatId);
		console.log(`🚪 移除群组:${chatId}`);
	}
	getActiveGroups(){
		return Array.from(this.groups.values()).filter(g=>g.active&&g.type!=='private');
	}
	//新闻缓存管理
	cacheNewsDetail(newsId,detail){
		this.newsCache.set(newsId,detail);
		//异步保存，不阻塞主线程
		setImmediate(()=>this.saveCache());
	}
	getNewsDetail(newsId){
		return this.newsCache.get(newsId)||'详情暂不可用';
	}
	markNewsSent(newsId){
		this.sentNews.add(newsId);
		setImmediate(()=>this.saveCache());
	}
	isNewsSent(newsId){
		return this.sentNews.has(newsId);
	}
	clearOldCache(days=7){
		const cutoff=Date.now()-(days*24*60*60*1000);
		let removed=0;
		for(const[newsId,detail] of this.newsCache){
			if(detail.cachedAt&&new Date(detail.cachedAt).getTime()<cutoff){
				this.newsCache.delete(newsId);
				removed++;
			}
		}
		if(removed>0){
			console.log(`🗑️	清理了 ${removed} 条旧缓存`);
			this.saveCache();
		}
	}
}

//新闻抓取器（支持获取详情）
class NewsFetcher{
	async fetchNews(){
		try{
			console.log(`🌐 抓取新闻列表`);
			const response=await axios.get('https://www.flw.ph/forum.php?mod=forumdisplay&fid=40&filter=lastpost&orderby=dateline&mobile=2',{timeout:15000});
			const newsList=this.parseNewsList(response.data);
			console.log(`📰 获取到 ${newsList.length}条新闻`);
			return newsList;
		}catch(error){
			console.error('❌ 抓取失败:',error.message);
			return[];
		}
	}
	parseNewsList(html){
		const $=cheerio.load(html);
		const newsList=[];
		$('#threadlist>li').each((i,e)=>{
			const $e=$(e);
			const id=$e.attr('id').split('_').pop();
			const title=$e.find('.c h3').html().split('<').shift().trim();
			const time=$e.find('.time').text().trim();
			const brief=$e.find('.art-title').text().replace(/[\r\n\s]/g,'').replace(/^(【[^】]+】|[^：]+报：) */,'');
			if(!id||!title)return
			newsList.push({
				id,title,time,brief,detail:'',//稍后填充
				timestamp:new Date().toISOString()
			});
		});
		return newsList;
	}
	
	
	
	async fetchNewsDetail(news){
		try{
			if(!news.url||news.url===this.sourceUrl){
				news.detail='详情内容暂不可用';
				news.preview='点击展开查看详情';
				return;
			}
			console.log(`🔍 获取新闻详情:${news.title.substring(0,30)}...`);
			const response=await axios.get(news.url,{
				headers:this.headers,
				timeout:10000
			});
			const detail=this.extractNewsDetail(response.data);
			news.detail=this.cleanDetailText(detail);
			news.preview=this.generatePreview(news.detail);
		}catch(error){
			console.log(`⚠️	获取详情失败:${error.message}`);
			news.detail='无法加载新闻详情，请访问原文链接查看';
			news.preview='详情加载失败';
		}
	}
	extractNewsDetail(html){
		const $=cheerio.load(html);
		let content='';
		//常见的内容选择器
		const contentSelectors=[
			'.article-content','.post-content','.entry-content',
			'.content','.main-content','.body','article'
		];
		for(const selector of contentSelectors){
			const elements=$(selector);
			if(elements.length>0){
				content=elements.text();
				break;
			}
		}
		//如果没找到，尝试获取所有段落
		if(!content.trim()){
			content=$('p').map((i,el)=>$(el).text()).get().join('\n\n');
		}
		return content.trim();
	}
	cleanDetailText(text){
		if(!text)return'详情内容暂不可用';
		//清理多余空格和换行
		text=text
			.replace(/\s+/g,'')
			.replace(/\n\s*\n/g,'\n\n')
			.trim();
		//限制长度
		if(text.length>CONFIG.MESSAGE.MAX_DETAIL_LENGTH){
			text=text.substring(0,CONFIG.MESSAGE.MAX_DETAIL_LENGTH)+'...';
		}
		return text;
	}
	generatePreview(detail){
		if(!detail||detail==='详情内容暂不可用'){
			return'点击展开按钮查看详情';
		}
		const preview=detail.substring(0,CONFIG.MESSAGE.MAX_PREVIEW_LENGTH);
		return preview.length<detail.length?preview+'...':preview;
	}
	generateNewsId(url){
		return Buffer.from(url).toString('base64').substring(0,20);
	}
	truncateText(text,maxLength){
		if(text.length<=maxLength)return text;
		return text.substring(0,maxLength)+'...';
	}
	sleep(ms){
		return new Promise(resolve=>setTimeout(resolve,ms));
	}
}

//Telegram机器人（带折叠详情功能）
class NewsBot{
	constructor(){
		if(!CONFIG.TELEGRAM_TOKEN){
			throw new Error('请在.env文件中设置TELEGRAM_BOT_TOKEN');
		}
		this.bot=new TelegramBot(CONFIG.TELEGRAM_TOKEN,{
			polling:true,filepath:false
		});
		this.storage=new StorageManager();
		this.fetcher=new NewsFetcher();
		this.botInfo=null;
		this.isSending=false;
	}
	async start(){
		//初始化存储
		await this.storage.init();
		//获取机器人信息
		this.botInfo=await this.bot.getMe();
		console.log(`✅ 机器人启动:@${this.botInfo.username}`);
		//设置事件处理器
		this.setupEventHandlers();
		//启动定时任务
		this.startScheduler();
		//启动Web服务器
		this.startWebServer();
		//清理旧缓存
		this.storage.clearOldCache();
		console.log('🚀 机器人启动完成！');
	}
	setupEventHandlers(){
		console.log('🔧 设置事件处理器...');
		//机器人加入群组
		this.bot.on('new_chat_members',async(msg)=>{
			const newMembers=msg.new_chat_members;
			const botUser=await this.getBotInfo();
			const isBotJoined=newMembers.some(member=>
				member.id===botUser.id
			);
			if(isBotJoined)await this.handleGroupJoin(msg);
		});
		//机器人被移除
		this.bot.on('left_chat_member',async(msg)=>{
			const botUser=await this.getBotInfo();
			if(msg.left_chat_member.id===botUser.id){
				await this.handleGroupLeave(msg);
			}
		});
		//回调查询处理（折叠详情功能核心）
		this.bot.on('callback_query',async(callbackQuery)=>{
			await this.handleCallbackQuery(callbackQuery);
		});
		//命令处理
		this.bot.onText(/\/start/,(msg)=>this.handleCommand(msg,'start'));
		this.bot.onText(/\/news/,(msg)=>this.handleCommand(msg,'news'));
		this.bot.onText(/\/help/,(msg)=>this.handleCommand(msg,'help'));
		this.bot.onText(/\/status/,(msg)=>this.handleCommand(msg,'status'));
		//错误处理
		this.bot.on('polling_error',(error)=>{
			console.error('❌ 轮询错误:',error.message);
		});
	}
	async getBotInfo(){
		if(!this.botInfo)this.botInfo=await this.bot.getMe();
		return this.botInfo;
	}
	async handleGroupJoin(msg){
		const chatId=msg.chat.id;
		const chatTitle=msg.chat.title||'未命名群组';
		const chatType=msg.chat.type;
		console.log(`👥 机器人加入群组:${chatTitle}(${chatId})`);
		//添加到群组管理器
		this.storage.addGroup(chatId,chatTitle,chatType);
		//发送欢迎消息（不在私聊中发送）
		if(chatType!=='private'){
			const welcomeMsg=
				`🤖*新闻机器人已加入！*\n\n`+
				`我将定时推送最新新闻到此群组。\n\n`+
				`📱*功能特色：*\n`+
				`• 自动推送最新新闻\n`+
				`• 图文并茂，支持折叠详情\n`+
				`• 点击"展开详情"查看完整内容\n`+
				`• 无需跳转外部链接\n\n`+
				`📋*可用命令：*\n`+
				`/news-手动获取新闻\n`+
				`/status-查看状态\n`+
				`/help-显示帮助`;
			await this.bot.sendMessage(chatId,welcomeMsg,{
				parse_mode:'Markdown',
				disable_web_page_preview:true
			});
		}
	}
	async handleGroupLeave(msg){
		const chatId=msg.chat.id;
		console.log(`🚪 机器人离开群组:${chatId}`);
		this.storage.removeGroup(chatId);
	}
	//处理回调查询（展开/折叠详情）
	async handleCallbackQuery(callbackQuery){
		const{data,message,from}=callbackQuery;
		const chatId=message.chat.id;
		const messageId=message.message_id;
		console.log(`🔄 处理回调:${data}`);
		try{
			if(data.startsWith('expand_')){
				await this.expandNewsDetail(callbackQuery);
			}
			//确认回调已处理
			await this.bot.answerCallbackQuery(callbackQuery.id);
		}catch(error){
			console.error('❌ 处理回调失败:',error);
			await this.bot.answerCallbackQuery(callbackQuery.id,{
				text:'操作失败，请重试',
				show_alert:false
			});
		}
	}
	async expandNewsDetail(callbackQuery){
		const{data,message}=callbackQuery;
		const newsId=data.replace('expand_','');
		const chatId=message.chat.id;
		const messageId=message.message_id;
		//获取缓存的新闻详情
		const detail="...."
		//this.storage.getNewsDetail(newsId);
		//创建展开后的消息
		const expandedCaption=
			`📰*新闻详情*\n\n${detail}`;
		//更新消息
		await this.bot.editMessageCaption(expandedCaption,{
			chat_id:chatId,
			message_id:messageId,
			parse_mode:'Markdown'
		});
	}
	async handleCommand(msg,command){
		const chatId=msg.chat.id;
		const chatType=msg.chat.type;
		console.log(`📝 收到命令:/${command}from ${chatId}`);
		switch(command){
			case'start':
				if(chatType==='private'){
					await this.bot.sendMessage(chatId,
						`👋*欢迎使用新闻机器人！*\n\n`+
						`请将我添加到群组中，我会：\n`+
						`✅ 自动定时推送最新新闻\n`+
						`✅ 支持图文消息和折叠详情\n`+
						`✅ 无需跳转外部链接\n\n`+
						`🌐*新闻源:*${CONFIG.DATA_SOURCE_URL}\n`+
						`⏰*推送频率:*每1分钟\n\n`+
						`📱*使用说明:*\n`+
						`1. 将我添加到群组\n`+
						`2. 我会自动发送欢迎消息\n`+
						`3. 定时推送新闻到群组\n`+
						`4. 点击"展开详情"查看完整内容`,
						{
							parse_mode:'Markdown',
							disable_web_page_preview:true
						}
					);
				}
				break;
			case'news':
				await this.sendNewsToChat(chatId);
				break;
			case'help':
				await this.bot.sendMessage(chatId,
					`📖*可用命令:*\n\n`+
					`/start-开始使用\n`+
					`/news-手动获取最新新闻\n`+
					`/status-查看机器人状态\n`+
					`/help-显示此帮助信息\n\n`+
					`💡*功能说明:*\n`+
					`• 机器人会自动定时推送新闻\n`+
					`• 点击"展开详情"查看完整内容\n`+
					`• 无需跳转到外部网站`,
					{
						parse_mode:'Markdown',
						disable_web_page_preview:true
					}
				);
				break;
			case'status':
				const groups=this.storage.getActiveGroups();
				await this.bot.sendMessage(chatId,
					`📊*机器人状态*\n\n`+
					`🤖*用户名:*@${this.botInfo.username}\n`+
					`👥*活跃群组:*${groups.length}个\n`+
					`⏰*推送频率:*${CONFIG.SCHEDULE_TIME}\n`+
					`📰*缓存新闻:*${this.storage.newsCache.size}条\n\n`+
					`🔄*最近活动:*${new Date().toLocaleString('zh-CN')}`,
					{
						parse_mode:'Markdown',
						disable_web_page_preview:true
					}
				);
				break;
		}
	}
	//创建新闻消息（带折叠详情按钮）
	createNewsCaption(news){
		return `📰*${news.title}*\n\n`+
					 `📝 ${news.brief}\n\n`+
					 `🕐 ${news.time}\n\n`+
					 `👇 点击下方按钮查看详情`;
	}
	//发送新闻到所有群组
	async sendNewsToAllGroups(){
		if(this.isSending)return;
		this.isSending=true;
		const groups=this.storage.getActiveGroups();
		if(groups.length===0){
			this.isSending=false;
			return;
		}
		try{
			//获取新闻
			const allNews=await this.fetcher.fetchNews();
			const newNews=allNews.filter(news=>!this.storage.isNewsSent(news.id));
			if(newNews.length===0){
				this.isSending=false;
				return;
			}
			//限制每次发送数量
			const newsToSend=newNews.slice(0,30);
			//向每个群组发送新闻
			for(const group of groups){
				for(const news of newsToSend){
					const success=await this.sendNewsItem(group.id,news);
					if(success)this.storage.markNewsSent(news.id);
					await this.sleep(CONFIG.DELAY_BETWEEN_NEWS);
				}
				await this.sleep(CONFIG.DELAY_BETWEEN_GROUPS);
			}
			console.log(`✅ 推送完成，发送了 ${newsToSend.length}条新闻`);
		}catch(error){
			console.error('❌ 推送失败:',error);
		}finally{
			this.isSending=false;
		}
	}
	//发送单条新闻到指定聊天
	async sendNewsToChat(chatId){
		try{
			const newsItems=await this.fetcher.fetchNews();
			const newsToSend=newsItems.slice(0,1);//只发1条
			for(const news of newsToSend){
				await this.sendNewsItem(chatId,news);
			}
		}catch(error){
			console.error('❌ 发送新闻失败:',error);
		}
	}
	//发送单条新闻（带折叠详情按钮）
	async sendNewsItem(chatId,news){
		try{
			const caption=this.createNewsCaption(news);
			const options={
				caption:caption,
				parse_mode:'Markdown',
				reply_markup:{
					inline_keyboard:[
						[{text:'📖 展开详情',callback_data:`expand_${news.id}`}]
					]
				}
			};
			await this.bot.sendMessage(chatId,caption,{
				parse_mode:'Markdown',
				reply_markup:options.reply_markup,
				disable_web_page_preview:true
			});
			return true;
		}catch(error){
			console.error(`❌ 发送失败到 ${chatId}:`,error.message);
			return false;
		}
	}
	//启动定时任务
	startScheduler(){
		cron.schedule(CONFIG.SCHEDULE_TIME,()=>{
			this.sendNewsToAllGroups();
		},{scheduled:true,timezone:'Asia/Shanghai'});
		//启动10秒后执行第一次
		setTimeout(()=>this.sendNewsToAllGroups(),10000);
	}
	//启动Web服务器
	startWebServer(){
		const http=require('http');
		const server=http.createServer((req,res)=>{
			const groups=this.storage.getActiveGroups();
			if(req.url==='/health'){
				res.writeHead(200,{'Content-Type':'application/json'});
				res.end(JSON.stringify({
					status:'healthy',
					bot:`@${this.botInfo?.username||'unknown'}`,
					groups:groups.length,
					cache:this.storage.newsCache.size,
					uptime:Math.floor(process.uptime())
				},null,2));
			}else if(req.url==='/stats'){
				res.writeHead(200,{'Content-Type':'application/json'});
				res.end(JSON.stringify({
					active_groups:groups.length,
					cached_news:this.storage.newsCache.size,
					sent_news:this.storage.sentNews.size,
					last_update:new Date().toISOString()
				},null,2));
			}else{
				res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
				res.end(`...`);
			}
		});
		server.listen(CONFIG.PORT,()=>{
			console.log(`🌐 Web服务器运行在:http://localhost:${CONFIG.PORT}`);
		});
	}
	sleep(ms){
		return new Promise(resolve=>setTimeout(resolve,ms));
	}
}

//启动程序
async function main(){
	try{
		const bot=new NewsBot();
		await bot.start();
	}catch(error){
		console.error('💥 启动失败:',error);
		process.exit(1);
	}
}
//全局错误处理
process.on('uncaughtException',(error)=>{
	console.error('💥 未捕获异常:',error);
});
process.on('unhandledRejection',(reason,promise)=>{
	console.error('💥 未处理的Promise拒绝:',reason);
});

//启动
main();