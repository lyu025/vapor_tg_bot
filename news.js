const cheerio=require('cheerio')
const axios=require('axios')

class NS{
	constructor(){
		this.m={}
	}
	build(n){
		let text=`<b>${n.title}</b>\n\n<code>${n.brief}</code>\n\n<i>${n.time}</i>`
		let btns={
			inline_keyboard:[
				[{text:'📖 展开详情',callback_data:`news_info__${n.id}`}]
			]
		}
		if(n.info.length>0){
			text=`<b>${n.title}</b>\n\n<i>${n.time}</i>\n\n<code>${n.info[n.index]}</code>`
			if(n.info.length==1)btns={}
			else btns.inline_keyboard[0]=n.info.map((_,i)=>({text:`#${i+1}`,callback_data:`news_index__${n.id}_${i}`}))
		}
		return {text,imgs:n.imgs,btns}
	}
	async list(filter=false){
		const x=await axios.get('https://www.flw.ph/forum.php?mod=forumdisplay&fid=40&filter=lastpost&orderby=dateline&mobile=2',{timeout:15000})
		const $=cheerio.load(x.data),o=[]
		$('#threadlist>li').each((i,e)=>{
			const $e=$(e),imgs=[]
			const id=$e.attr('id').split('_').pop()
			const time=$e.find('.time').text().trim()
			const title=$e.find('.c h3').html().split('<').shift().trim()
			const brief=$e.find('.art-title').text().replace(/[\r\n\s]/g,'').replace(/^(【[^】]+】|[^：]+报：) */,'')
			$e.find('.piclist img').each((j,ii)=>imgs.push($(ii).attr('src')))
			if(!id||!title||(filter&&(id in this.m)))return
			o.push(this.m[id]={id,title,time,brief,imgs,info:[],index:0})
		})
		return o
	}
	async info(id){
		const x=await axios.get(`https://www.flw.ph/forum.php?mod=viewthread&tid=${id}&mobile=2`,{timeout:10000})
		let $=cheerio.load(x.data),n=this.m[id],o=''
		const walk=_=>_.each((i,e)=>{
			if(e.type=='text'){
				const text=$(e).text().trim()
				if(text)o+=`\n		${text}`
			}else if(e.type==='tag'){
				const el=$(e)
				if(el.is('br')){}else if(el.is('strong')){
					o+=`\n		${el.text().trim()}`
				}else{
					walk(el.contents())
				}
			}
		})
		walk($('.message').contents())
		this.m[id].info
		o=o.replace(/^\n\s*/,'').trim()
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