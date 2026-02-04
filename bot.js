const Bot=require('node-telegram-bot-api')
const cron=require('node-cron')

class TB{
	constructor(){
		this.token='8237071233:AAFLpj8Bw_j9MgjQWPJjMHKIUFIis6mamrQ'
		this.bot=this.me=null
		this.wait=false
		this.gm={
			'-1003542336815':{id:-1003542336815,type:'supergroup',title:'景'}
		}
	}
	async _me(){
		return await this.bot.getMe()
	}
	async start(){
		this.bot=new Bot(this.token,{
			polling:{
				autoStart:true,interval:1000, // 增加间隔
				params:{
					timeout:30,offset:-1 // 关键：从最新消息开始
				}
			}
		})
		this.me=await this._me()
		this.events()
	}
	async send(id,text,imgs=[],reply_markup={}){
		if(imgs.length<1){
			await this.bot.sendMessage(id,text,{
				parse_mode:'HTML',reply_markup,
				disable_web_page_preview:true
			})
		}else{
			await this.bot.sendPhoto(id,imgs[0],{
				parse_mode:'HTML',reply_markup,caption:text,
				disable_web_page_preview:true
			})
		}
	}
	async edit(chat_id,message_id,text,imgs,reply_markup){
		if(imgs.length<1){
			await this.bot.editMessageText(text,{
				chat_id,message_id,parse_mode:'HTML',reply_markup,
				disable_web_page_preview:true
			})
		}else{
			await this.bot.editMessageCaption(text,{
				chat_id,message_id,parse_mode:'HTML',reply_markup,
				disable_web_page_preview:true
			})
		}
	}
	events(){
		this.bot.on('polling_error',e=>{ // 错误
			if(!e.message.includes('409'))return
			this.bot.stopPolling()
			setTimeout(()=>this.bot.startPolling(),3000)
		})
		this.bot.on('new_chat_members',async m=>{ // 入群
			if(!this.me)this.me=await this._me()
			const {new_chat_members:ms,chat:{id,type,title}}=m
			if(!ms.some(_=>_.id===this.me.id))return
			this.gm[id]={id,type,title}
			console.log(JSON.stringify(this.gm));
			await this.send(id,`Vapor助手 已加入！`)
		})
		this.bot.on('left_chat_member',async m=>{ // 退群
			const id=m.chat.id
			if(!this.me)this.me=await this._me()
			if(m.left_chat_member.id==this.me.id&&(id in this.gm))delete this.gm[id]
		})
		this.bot.on('callback_query',async q=>{
			const {id,data,message:m}=q;
			try{
				const [fn,o]=data.split('__')
				if(this[fn])this[fn](m.chat.id,m.message_id,o)
				await this.bot.answerCallbackQuery(id)
			}catch(e){
				await this.bot.answerCallbackQuery(id,{
					text:e.message,show_alert:false
				});
			}
		})
	}
	cmd(key,fn){
		this.bot.onText(new RegExp('/'+key,'i'),async m=>fn(m.chat.id))
	}
	msg(o={}){
		this.bot.on('message',m=>{
			let id=m.chat.id,uid=m.from.id,v=false
			for(let key in o)if(key==m.text){
				o[key](id,uid)
				v=true
			}
			if(!v&&o._)o._(id,uid,m.text)
		})
	}
	cron(fn,_='*/20 * * * * *'){
		const task=cron.schedule(_,()=>fn(),{scheduled:true,timezone:'Asia/Shanghai'})
		setTimeout(()=>fn(),2000)
		task.start()
	}
	sleep(ms){
		return new Promise(r=>setTimeout(r,ms))
	}
}
module.exports=TB