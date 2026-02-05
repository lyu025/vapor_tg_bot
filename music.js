const cheerio=require('cheerio')
const axios=require('axios')

class MS{
	async search(kw){ // 搜索歌曲
		const x=await axios.get('https://www.gequbao.com/s/'+encodeURIComponent(kw),{timeout:15000})
		const $=cheerio.load(x.data),btns={inline_keyboard:[]}
		const text='搜索“'+kw+'”结果：'+$('.h6.badge-light-orange').text().trim()
		$('.row.py-2d5 .btn-sm').each((i,e)=>{
			const $e=$(e),id=$e.attr('href').split('/').pop().trim()
			const [title,singer]=$e.attr('title').split(' - ')
			if(title.length>10||singer.length>10)return
			btns.inline_keyboard.push([{text:`${title} - ${singer}`,callback_data:`music_play__${id}_${title}_${singer}`}])
		})
		return {text,btns}
	}
	async src(id){
		const x=await axios.get('https://www.gequbao.com/music/'+id,{timeout:15000})
		const {mp3_author,play_id}=eval(x.data.split(`window.appData = `).pop().split(`;`).shift())
		const $=cheerio.load(x.data)
		const lyrics=$('#content-lrc').text().split('\n').map(_=>{
			let [t,o]=_.split(']')
			return o
		}).join(`\n`)
		const q=new URLSearchParams()
		q.append('id',play_id)
		const ux=await axios.post('https://www.gequbao.com/api/play-url',q,{
			headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'}
		})
		return {url:ux.data.data.url,lyrics}
	}
}
module.exports=MS