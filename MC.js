class MC{
	static #o=null
	static O(B,C,R){
		if(!MC.#o)MC.#o=new MC(B,C,R)
		return MC.#o
	}
	constructor(B,C,R){
		this.B=B
		this.C=C
		this.R=R
		this._={}
	}
	init(){
		// 点击底部按钮
		this.B.H['歌曲检索']=async(id,uid,init=true)=>{
			if(!(uid in this.B.U))this.B.U[uid]={_:'gqjs.歌曲检索.●'}
			this.B.U[uid]._='gqjs.歌曲检索.●'
			
			if(!this.B.U[uid].gqjs){
				const text='📀 检索、播放你想要的歌曲，输入关键词：'
				await this.B.text(id,text)
				return
			}
			await this.search(id,this.B.U[uid].gqjs)
		}
		// 点击内联按钮
		this.B.H.gqjs_play=async(cid,mid,o)=>{
			const [id,title,performer]=o.split('_')
			await this.source(cid,id,title,performer)
		}
		this.B.H.gqjs_index=async(cid,mid,o)=>{
			const [id,x]=o.split('_'),i=parseInt(x)
			if(this._[id].index===i)return
			this._[id].index=i
			const caption=this._[id].lyrics[i],c=this._[id].lyrics.length-1
			const btns={inline_keyboard:[],resize_keyboard:true}
			if(i<1)btns.inline_keyboard.push([{text:`下一页`,callback_data:`gqjs_index.${id}_1`}])
			else if(i<c)btns.inline_keyboard.push([{text:`上一页`,callback_data:`gqjs_index.${id}_${i-1}`},{text:`下一页`,callback_data:`gqjs_index.${id}_${i+1}`}])
			else btns.inline_keyboard.push([{text:`上一页`,callback_data:`gqjs_index.${id}_${i-1}`}])
			await this.B.edit_caption(cid,mid,caption,btns)
		}
	}
	async search(cid,q){ // 搜索歌曲
		const url='https://www.gequbao.com/s/'+encodeURIComponent(q)
		const $=await this.R.get(url,{timeout:15000}).then(_=>this.C.load(_.data)).catch(_=>null)
		let text=`检索歌曲，搜索关键字“${q}”结果如下：`
		const btns={inline_keyboard:[],resize_keyboard:true}
		$('.row.py-2d5 .btn-sm').each((i,e)=>{
			const $e=$(e),id=$e.attr('href').split('/').pop().trim()
			const [title,singer]=$e.attr('title').split(' - ')
			if(title.length>10||singer.length>10)return
			btns.inline_keyboard.push([{text:`${title} - ${singer}`,callback_data:`gqjs_play.${id}_${title}_${singer}`}])
		})
		if(btns.inline_keyboard.length<1)text+='空空如也！'
		await this.B.text(cid,text,btns)
	}
	async source(cid,id,title,performer){
		const u='https://www.gequbao.com/music/'+id
		const {$,mp3_author,play_id}=await this.R.get(u,{timeout:15000}).then(_=>{
			const o=eval(_.data.split(`window.appData = `).pop().split(`;`).shift())
			if(typeof o=='object')o.$=this.C.load(_.data)
			return o
		}).catch(_=>({}))
		if(!$)return
		let lyrics=$('#content-lrc').text().split('\n').map(_=>_.split(']').pop()).join(`\n`)
		if(1000>=lyrics.length)lyrics=[lyrics]
		else{
			const v=[]
			for(let i=0;i<lyrics.length;i+=1000)v.push(lyrics.substr(i,1000))
			lyrics=v
		}
		const btns={inline_keyboard:[],resize_keyboard:true}
		if(lyrics.length>1)btns.inline_keyboard.push([{text:`下一页`,callback_data:`gqjs_index.${id}_1`}])
		const q=new URLSearchParams()
		q.append('id',play_id)
		const url=await this.R.post('https://www.gequbao.com/api/play-url',q,{
			headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'}
		}).then(_=>_.data.data.url).catch(_=>null)
		if(!url)return
		this._[id]={lyrics,url,index:0}
		await this.B.audio(cid,url,title,performer,lyrics[0],btns)
	}
}
module.exports=MC