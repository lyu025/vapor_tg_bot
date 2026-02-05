const B=require('node-telegram-bot-api')

class BT{
	static #tk='8237071233:AAFLpj8Bw_j9MgjQWPJjMHKIUFIis6mamrQ'
	static #o=null
	static O(){
		if(!BT.#o)BT.#o=new BT()
		return BT.#o
	}
	constructor(){
		this.U={}
		this.o=this.id=null
		this.G=[-1003542336815]
		this.H={_:(id,o)=>{this.U[id][this.U[id]._]=o}}
	}
	async start(){
		this.o=new B(BT.#tk,{polling:{autoStart:true,interval:1000,params:{timeout:30,offset:-1}}})
		this.id=await this.o.getMe().then(_=>_.id).catch(_=>0)
		// 错误
		this.o.on('polling_error',e=>{
			if(!e.message.includes('409'))return
			this.o.stopPolling()
			setTimeout(()=>this.o.startPolling(),3000)
		})
		// 入群
		this.o.on('new_chat_members',async m=>{
			if(this.id<1)this.id=await this.o.getMe().then(_=>_.id).catch(_=>0)
			const {new_chat_members:ms,chat:{id,type,title}}=m
			if(!ms.some(_=>_.id===this.id))return
			if(!this.G.includes(id))this.G.push(id)
			
			console.log(JSON.stringify(this.G))
			await this.text(id,`Vapor助手 已加入！`)
		})
		// 退群
		this.o.on('left_chat_member',async m=>{
			const id=m.chat.id
			if(this.id<1)this.id=await this.o.getMe().then(_=>_.id).catch(_=>0)
			if(m.left_chat_member.id==this.id&&(id in this.G))this.G=this.G.filter(_=>_!=id)
			
			console.log(JSON.stringify(this.G))
		})
		this.o.on('callback_query',async({id,data:x,message:m})=>{
			try{
				const [k,o]=x.split('.')
				if(k in this.H)this.H[k](m.chat.id,m.message_id,o)
				await this.o.answerCallbackQuery(id)
			}catch(e){
				await this.o.answerCallbackQuery(id,{text:e.message,show_alert:false})
			}
		})
		this.o.on('message',async m=>{
			let id=m.chat.id,uid=m.from.id,o=m.text.trim()
			
			console.log({uid,id,o})
			if(o in this.H)await this.H[o](id,uid)
			else if(!o.startsWith('/'))this.H._(uid,o)
		})
	}
	async text(id,text,reply_markup={}){
		await this.sleep(1000)
		return await this.o.sendMessage(id,text,{
			parse_mode:'HTML',reply_markup,
			disable_web_page_preview:true
		})
	}
	async photo(id,img,caption,reply_markup={}){
		await this.sleep(1000)
		return await this.o.sendPhoto(id,img,{
			caption,parse_mode:'HTML',reply_markup,
			disable_web_page_preview:true
		})
	}
	async gallery(id,imgs,caption,reply_markup={}){
		await this.sleep(1000)
		await this.o.sendMediaGroup(id,imgs.map((_,i)=>({type:'photo',media:_,caption:''})))
		return await this.text(id,caption,reply_markup)
	}
	async edit_text(chat_id,message_id,text,reply_markup){
		await this.o.editMessageText(text,{
			chat_id,message_id,parse_mode:'HTML',reply_markup,
			disable_web_page_preview:true
		})
	}
	async edit_caption(chat_id,message_id,caption,reply_markup){
		await this.o.editMessageCaption(caption,{
			chat_id,message_id,parse_mode:'HTML',reply_markup,
			disable_web_page_preview:true
		})
	}
	cmd(k,f){
		this.o.onText(new RegExp('/'+k,'i'),m=>f(m.chat.id))
	}
	async is_admin(id,uid){
		try{
			const s=await this.o.getChatAdministrators(id)
			return s.some(_=>_.user.id===uid)
		}catch(e){
			return false
		}
	}
	sleep(ms){
		return new Promise(r=>setTimeout(r,ms))
	}
}
module.exports=BT