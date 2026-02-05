const cheerio=require('cheerio')
const axios=require('axios')

class NS{
	constructor(){
		this.m={}
	}
	_build(n){
		let text=`<b>${n.title}</b>\n\n<code>${n.brief}</code>\n\n<i>${n.time}</i>`
		let btns={
			inline_keyboard:[
				[{text:'📖 展开详情',callback_data:`news_info__${n.id}`}]
			]
		}
		if(n.info.length>0){
			text=`<b>${n.title}</b>\n\n<i>${n.time}</i>\n\n<code>${n.info[n.index]}</code>`
			if(n.info.length==1)btns={}
			else{
				const c=n.info.length-1,i=n.index
				if(c<1)btns.inline_keyboard=[]
				else if(i<1)btns.inline_keyboard[0]=[{text:`下一页`,callback_data:`news_index__${n.id}_1`}]
				else if(i<c)btns.inline_keyboard[0]=[{text:`上一页`,callback_data:`news_index__${n.id}_${i-1}`},{text:`下一页`,callback_data:`news_index__${n.id}_${i+1}`}]
				else btns.inline_keyboard[0]=[{text:`上一页`,callback_data:`news_index__${n.id}_${i-1}`}]
			}
		}
		return {text,imgs:n.imgs,btns}
	}
	async wakeup(){
		await axios.get('https://vapor-tg-bot.onrender.com/',{timeout:1000}).catch(_=>'')
	}
	async list(num=0,filter=false){
		const x=await axios.get('https://www.flw.ph/forum.php?mod=forumdisplay&fid=40&filter=lastpost&orderby=dateline&mobile=2',{timeout:15000})
		let $=cheerio.load(x.data),o=[]
		$('#threadlist>li').each((i,e)=>{
			const $e=$(e),imgs=[]
			const id=$e.attr('id').split('_').pop()
			const time=$e.find('.time').text().trim()
			const title=$e.find('.c h3').html().split('<').shift().trim()
			const brief=$e.find('.art-title').text().replace(/[\r\n\s]/g,'').replace(/^(【[^】]+】|[^：]+报：) */,'')
			$e.find('.piclist img').each((j,ii)=>imgs.push($(ii).attr('src')))
			if(!id||!title||(filter&&(id in this.m)))return
			this.m[id]={id,title,time,brief,imgs,info:[],index:0}
			o.push(this._build(this.m[id]))
		})
		if(num>0)o=o.slice(0,num)
		if(o.length>0)o.reverse()
		return o
	}
	async info(id){
		const x=await axios.get(`https://www.flw.ph/forum.php?mod=viewthread&tid=${id}&mobile=2`,{timeout:10000})
		const $=cheerio.load(x.data),n=this.m[id]
		const o=$('.message').text().replace(/(\s*\n\s*){2,}/g,`\n		`).trim()
		const a=(n.imgs.length<1?4000:1000)-(n.title+n.time).length,b=o.length
		if(a>=b)this.m[id].info=[o]
		else{
			this.m[id].info=[]
			for(let i=0;i<o.length;i+=a)this.m[id].info.push(o.substr(i,a))
		}
		return this.m[id].info
	}
}
module.exports=NS