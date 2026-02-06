process.on('uncaughtException',e=>console.error('🔴e:',e))
process.on('unhandledRejection',(r,_)=>console.error('🔴p:',r))

const T=require('node-cron')
const C=require('cheerio')
const R=require('axios')
const H=require('http')

const bt=require('./BT').O()
const cs=require('./CS').O(bt,R)
const zx=require('./ZX').O(bt,C,R)
const ys=require('./YS').O(bt,C,R)

bt.start().then(async()=>{
	// 类初始化
	cs.init()
	zx.init()
	ys.init()
	// 初始化命令
	bt.cmd('start',id=>bt.text(id,'💥 欢迎使用Vapor助手！',{
		keyboard:[['动态资讯','今日运势','随机段子'],['歌曲检索']],
		resize_keyboard:true
	}))
	// 定时服务唤醒,20秒一次
	T.schedule('*/20 * * * * *',async()=>{
		const url='https://vapor-tg-bot.onrender.com'
		await R.get(url,{timeout:1}).catch(()=>0)
	},{scheduled:true,timezone:'Asia/Shanghai'}).start()
	// 定时拉取资讯,两分钟一次
	const t_zx=async()=>{
		Object.values(zx.O).forEach(async([k,v])=>{
			if(v)await zx['list_'+k]()
		})
	}
	T.schedule('*/2 * * * *',t_zx,{scheduled:true,timezone:'Asia/Shanghai'}).start()
	await t_zx()
	
	return
	/*
		'今日运势':async(id,uid)=>{
			if(!UO[uid])UO[uid]={_:'今日运势'}
			UO[uid]._='今日运势'
			if(UO[uid].birthday){
				const inline_keyboard=[
					[
						{text:'生肖性格',callback_data:`jrys_sxxg__${uid}`},
						{text:'生肖运势',callback_data:`jrys_sxys__${uid}`},
					],
					[
						{text:'星座简介',callback_data:`jrys_xzjj__${uid}`},
						{text:'星座运势',callback_data:`jrys_xzys__${uid}`}
					]
				]
				await tb.send(id,`🍀 您的生日为：${UO[uid].birthday.join('/')}\n\n生肖为：${UO[uid].sx[1]}\n\n星座为：${UO[uid].xz[1]}`,[],{inline_keyboard,resize_keyboard:true})
				return
			}
			await tb.send(id,'🍀 查询今日运势，输入您的生日(如:2002/06/21)：',[],{})
		},
		'随机段子':async(id,uid)=>{
			if(!UO[uid])UO[uid]={_:'随机段子'}
			UO[uid]._='随机段子'
			const inline_keyboard=[
				[
					{text:'👻 笑话',callback_data:`sjdz_xh__${uid}`},
					{text:'🗯️ 好句',callback_data:`sjdz_hj__${uid}`},
					{text:'📜 诗词',callback_data:`sjdz_sc__${uid}`}
				]
			]
			const text=' 随机笑话、段子、诗词，点击下列按钮开始吧！'
			await tb.send(id,text,[],{inline_keyboard,resize_keyboard:true})
		},
		'歌曲检索':async(id,uid)=>{
			if(!UO[uid])UO[uid]={_:'歌曲检索',query:null}
			UO[uid]._='歌曲检索'
			const text='📀 检索、播放你想要的歌曲'+(UO[uid].query?'！':'，输入关键词：')
			await tb.send(id,text,[],{inline_keyboard:[],resize_keyboard:true})
		},
		_:async(id,uid,o)=>{
			if(!UO[uid])return
			if(UO[uid]._=='今日运势'){
				if(!/^\s*[1-9]\d{3}\s*\/\s*(0?[1-9]||1[0-2])\s*\/\s*(0?[1-9]||[1-3]\d)\s*$/.test(o)){
					await tb.send(id,'生日格式错误，请重新输入(年月日，如: 2000/6/6):',[],{})
					return
				}
				UO[uid].birthday=o.split('/').map(_=>parseInt(_.trim()))
				const {sx,xz}=ft.parse(UO[uid].birthday)
				UO[uid].sx=sx
				UO[uid].xz=xz
				const inline_keyboard=[
					[
						{text:'生肖性格',callback_data:`jrys_sxxg__${uid}`},
						{text:'生肖运势',callback_data:`jrys_sxys__${uid}`},
					],
					[
						{text:'星座简介',callback_data:`jrys_xzjj__${uid}`},
						{text:'星座运势',callback_data:`jrys_xzys__${uid}`}
					]
				]
				await tb.send(id,`🍀 您的生日为：${UO[uid].birthday.join('/')}\n\n生肖为：${sx[1]}\n\n星座为：${xz[1]}`,[],{inline_keyboard,resize_keyboard:true})
				return
			}
			if(UO[uid]._=='歌曲检索'){
				UO[uid].query=o
				const {text,btns}=await ms.search(o)
				await tb.send(id,text,[],btns)
				return
			}
		}
	})
	
	tb.news_info=async(cid,mid,id)=>{
		await ns.info(id)
		const {text,imgs,btns}=ns._build(ns.m[id])
		await tb.edit(cid,mid,text,imgs,btns)
	}
	tb.news_index=async(cid,mid,o)=>{
		const [id,index]=o.split('_')
		const i=parseInt(index)
		if(ns.m[id].index===i)return
		ns.m[id].index=i
		const {text,imgs,btns}=ns._build(ns.m[id])
		await tb.edit(cid,mid,text,imgs,btns)
	}
	tb.dtzx_switch=async(cid,mid,o)=>{
		const [uid,key]=o.split('_')
		if(key in ZM)ZM[key]=!ZM[key]
		const ks=Object.keys(ZM),inline_keyboard=[],text='🔥 实时获取已开启的媒体的最新资讯，点击下方按钮切换是否开启获取对应媒体最新资讯:'
		for(let i=0;i<ks.length;i+=3){
			const r=[]
			for(let j=0;j<3;j++)if(ks[i+j]){
				const k=ks[i+j],v=ZM[k]
				r.push({text:(v?'🟢':'🚫')+' '+k,callback_data:`dtzx_switch__${uid}_${k}`})
			}
			inline_keyboard.push(r)
		}
		await tb.edit(cid,UO[uid].mid,text,[],{
			inline_keyboard,resize_keyboard:true
		})
	}
	tb.jrys_sxxg=async(cid,mid,uid)=>{
		const {text,imgs,btns}=await ft.sxxg(UO[uid].sx)
		await tb.send(cid,text,imgs,btns)
	}
	tb.jrys_sxys=async(cid,mid,uid)=>{
		const {text,imgs,btns}=await ft.sxys(UO[uid].sx)
		await tb.send(cid,text,imgs,btns)
	}
	tb.jrys_xzjj=async(cid,mid,uid)=>{
		const {text,imgs,btns}=await ft.xzjj(UO[uid].sx)
		await tb.send(cid,text,imgs,btns)
	}
	tb.jrys_xzys=async(cid,mid,uid)=>{
		const {text,imgs,btns}=await ft.xzys(UO[uid].sx)
		await tb.send(cid,text,imgs,btns)
	}
	
	
	tb.music_index=async(cid,mid,o)=>{
		const [id,index]=o.split('_')
		const i=parseInt(index)
		if(ms.m[id].index===i)return
		ms.m[id].index=i
		const text=ms.m[id].lyrics[i]
		const btns={inline_keyboard:[[]]}
		const c=ms.m[id].lyrics.length-1
		if(i<1)btns.inline_keyboard[0]=[{text:`下一页`,callback_data:`music_index__${id}_1`}]
		else if(i<c)btns.inline_keyboard[0]=[{text:`上一页`,callback_data:`music_index__${id}_${i-1}`},{text:`下一页`,callback_data:`music_index__${id}_${i+1}`}]
		else btns.inline_keyboard[0]=[{text:`上一页`,callback_data:`music_index__${id}_${i-1}`}]
		await tb.edit(cid,mid,text,[''],btns)
	}
	tb.music_play=async(cid,mid,o)=>{
		const [id,title,performer]=o.split('_')
		const {text,url,btns}=await ms.src(id)
		await tb.bot.sendAudio(cid,url,{
			title,performer,caption:text,
			reply_markup:{inline_keyboard:btns,resize_keyboard:true}
		});
	}
	*/
})

// Web服务
H.createServer((_,P)=>{
	P.writeHead(200,{'Content-Type':'text/html;charset=utf-8'})
	P.end(`...`)
}).listen(3001,()=>{
	console.log(`🌐 Web服务器已启动！`)
})

