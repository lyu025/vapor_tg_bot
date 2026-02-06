class ZX{
	static #o=null
	static O(B,C,R){
		if(!ZX.#o)ZX.#o=new ZX(B,C,R)
		return ZX.#o
	}
	constructor(B,C,R){
		this.O={'菲龙网':['flw',true],'菲星报':['fxb',false],'财联社':['cls',false],'金十快讯':['jskx',false]}
		this.B=B
		this.C=C
		this.R=R
		this._={}
	}
	init(){
		// 点击底部按钮
		this.B.H['动态资讯']=async(id,uid,init=true)=>{
			if(!(uid in this.B.U))this.B.U[uid]={_:'dtzx.动态资讯.○'}
			this.B.U[uid]._='dtzx.动态资讯.○'
			
			if(this.B.U[uid].zxmid)await this.B.remove(id,this.B.U[uid].zxmid)
			this.B.U[uid].zxmid=null
			
			const ia=await this.B.is_admin(id,uid)
			const ks=Object.keys(this.O),inline_keyboard=[]
			let text='🔥 实时获取下列媒体的最新资讯: '+(ks.filter(_=>this.O[_][1]).join('、')||'空空如也！')
			if(ia){
				for(let i=0;i<ks.length;i+=3){
					const r=[]
					for(let j=0;j<3;j++)if(ks[i+j]){
						const k=ks[i+j],v=this.O[k][1]
						r.push({text:(v?'🟢':'🚫')+' '+k,callback_data:`dtzx_switch.${uid}_${k}`})
					}
					inline_keyboard.push(r)
				}
				text='🔥 实时获取已开启的媒体的最新资讯，点击下方按钮切换是否开启获取对应媒体最新资讯:'
			}
			this.B.U[uid].zxmid=await this.B.text(id,text,{
				inline_keyboard,resize_keyboard:true
			}).then(_=>_.message_id).catch(_=>null)
		}
		// 点击内联按钮-切换站点开关
		this.B.H.dtzx_switch=async(id,mid,o)=>{
			if(!this.B.U[uid].zxmid)return
			const [uid,k]=o.split('_')
			this.O[k][1]=!this.O[k][1]
			const ks=Object.keys(this.O),inline_keyboard=[],text='🔥 实时获取已开启的媒体的最新资讯，点击下方按钮切换是否开启获取对应媒体最新资讯:'
			for(let i=0;i<ks.length;i+=3){
				const r=[]
				for(let j=0;j<3;j++)if(ks[i+j]){
					const k=ks[i+j],v=this.O[k][1]
					r.push({text:(v?'🟢':'🚫')+' '+k,callback_data:`dtzx_switch.${uid}_${k}`})
				}
				inline_keyboard.push(r)
			}
			await this.B.edit_text(id,this.B.U[uid].zxmid,text,{
				inline_keyboard,resize_keyboard:true
			})
		}
		// 点击内联按钮-查看资讯详情
		this.B.H.dtzx_info=async(cid,mid,o)=>{
			const [k,id]=o.split('_')
			await this['info_'+k](id,cid,mid)
		}
		// 点击内联按钮-资讯详情分页
		this.B.H.dtzx_index=async(cid,mid,o)=>{
			const [k,id,x]=o.split('_'),i=parseInt(x),{title,time,info,imgs}=this._[k][id]
			const text=`<b>${title}</b>\n\n<i>${time}</i>\n\n${info[i]}`
			const btns={inline_keyboard:[]},c=info.length-1
			if(c<1)btns.inline_keyboard.length=0
			else if(i<1)btns.inline_keyboard.push([{text:`下一页`,callback_data:`dtzx_index.${k}_${id}_1`}])
			else if(i<c)btns.inline_keyboard.push([{text:`上一页`,callback_data:`dtzx_index.${k}_${id}_${i-1}`},{text:`下一页`,callback_data:`dtzx_index.${k}_${id}_${i+1}`}])
			else btns.inline_keyboard.push([{text:`上一页`,callback_data:`dtzx_index.${k}_${id}_${i-1}`}])
			if(imgs.length!=1)await this.B.edit_text(cid,mid,text,btns)
			else await this.B.edit_caption(cid,mid,text,btns)
		}
	}
	async list_flw(){
		if(!('flw' in this._))this._.flw={}
		const url='https://www.flw.ph/forum.php?mod=forumdisplay&fid=40&filter=lastpost&orderby=dateline&mobile=2'
		const s=[],$=await this.R.get(url,{timeout:15000}).then(_=>this.C.load(_.data)).catch(_=>null)
		if(!$)return s
		const ss=$('#threadlist>li').toArray().reverse()
		for(const g of this.B.G)for(let i=0;i<ss.length;i++){
			const $e=$(ss[i]),imgs=[]
			const id=$e.attr('id').split('_').pop()
			const time=$e.find('.time').text().trim()
			const title=$e.find('.c h3').html().split('<').shift().trim()
			const brief=$e.find('.art-title').text().replace(/[\r\n\s]/g,'').replace(/^(【[^】]+】|[^：]+报：) */,'')
			$e.find('.piclist img').each((j,ii)=>imgs.push($(ii).attr('src')))
			if(!id||!title||(id in this._.flw))continue
			this._.flw[id]={title,time,brief,imgs,info:[],i:0}
			const text=`<b>${title}</b>\n\n${brief}\n\n<i>${time}</i>`
			const btns={inline_keyboard:[[{text:'📖 展开详情',callback_data:`dtzx_info.flw_${id}`}]]}
			if(imgs.length<1)await this.B.text(g,text,btns)
			else if(imgs.length<2)await this.B.photo(g,imgs[0],text,btns)
			else await this.B.gallery(g,imgs,text,btns)
		}
	}
	async info_flw(id,cid,mid){
		const url='https://www.flw.ph/forum.php?mod=viewthread&mobile=2&tid='
		const {imgs,title,time}=this._.flw[id],$=await this.R.get(url+id,{timeout:15000}).then(_=>this.C.load(_.data)).catch(_=>null)
		const o=$('.message').text().replace(/(\s*\n\s*){1,}/g,`\n　　`).trim()
		const a=(imgs.length<1?4000:1000)-(title+time).length,b=o.length
		if(a>=b)this._.flw[id].info=[o]
		else{
			this._.flw[id].info=[]
			for(let i=0;i<o.length;i+=a)this._.flw[id].info.push(o.substr(i,a))
		}
		const text=`<b>${title}</b>\n\n<i>${time}</i>\n\n${this._.flw[id].info[0]}`
		const btns={inline_keyboard:this._.flw[id].info.length>1?[[{text:`下一页`,callback_data:`dtzx_index.flw_${id}_1`}]]:[]}
		if(imgs.length!=1)await this.B.edit_text(cid,mid,text,btns)
		else await this.B.edit_caption(cid,mid,text,btns)
	}
}
module.exports=ZX