const cheerio=require('cheerio')
const axios=require('axios')

class MS{
	async search(kw){ // 搜索歌曲
		const x=await axios.get('https://www.gequbao.com/s/'+encodeURIComponent(kw),{timeout:15000})
		const $=cheerio.load(x.data),btns={inline_keyboard:[]}
		let text='搜索“'+kw+'”结果：'
		$('.row.py-2d5 .btn-sm').each((i,e)=>{
			const $e=$(e),id=$e.attr('href').split('/').pop().trim()
			const [title,singer]=$e.attr('title').split(' - ')
			if(title.length>10||singer.length>10)return
			btns.inline_keyboard.push([{text:`${title} - ${singer}`,callback_data:`music_play__${id}_${title}_${singer}`}])
		})
		if(btns.inline_keyboard.length<1)text+='空空如也！'
		return {text,btns}
	}
	async src(id){
		if(!this.m)this.m={}
		const x=await axios.get('https://www.gequbao.com/music/'+id,{timeout:15000})
		const {mp3_author,play_id}=eval(x.data.split(`window.appData = `).pop().split(`;`).shift())
		const $=cheerio.load(x.data)
		let lyrics=$('#content-lrc').text().split('\n').map(_=>{
			let [t,o]=_.split(']')
			return o
		}).join(`\n`)
		if(1000>=lyrics.length)lyrics=[lyrics]
		else{
			const v=[]
			for(let i=0;i<lyrics.length;i+=1000)v.push(lyrics.substr(i,1000))
			lyrics=v
		}
		let btns=[[]]
		if(lyrics.length>1)btns[0]=[{text:`下一页`,callback_data:`music_index__${id}_1`}]
		const q=new URLSearchParams()
		q.append('id',play_id)
		const ux=await axios.post('https://www.gequbao.com/api/play-url',q,{
			headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'}
		})
		const url=ux.data.data.url
		this.m[id]={lyrics,url,index:0}
		return {url,text:lyrics[0],btns}
	}
}
module.exports=MS