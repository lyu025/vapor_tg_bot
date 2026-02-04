const FT=require('./fortune')
const MS=require('./music')
const CS=require('./clause')
const NS=require('./news')
const TB=require('./bot')

const ft=new FT()
const ms=new MS()
const cs=new CS()
const ns=new NS()

const tb=new TB()

tb.start().then(()=>{
	const state={}
	const _msg=async(id,uid,data=null)=>{
		if(!(uid in state))return
		const as=['szsr','sxxg','sxys','xzjj','xzys'],bs=['xh','hj','sc'],s=state[uid]
		if(!s||!(as.includes(s)||bs.includes(s)||s=='ssgq'))return
		if(s=='ssgq'){
			if(!data){
				await tb.send(id,'请输入歌曲名称/歌手关键字:',[],{})
				return
			}
			delete state[uid]
			const {text,btns}=await ms.search(data)
			await tb.send(id,text,[],btns)
		}
		if(s=='szsr'){
			if(!data){
				await tb.send(id,'请输入您的生日(年月日，如: 2000/6/6):',[],{})
				return
			}
			if(!/^\s*[1-9]\d{3}\s*\/\s*(0?[1-9]||1[0-2])\s*\/\s*(0?[1-9]||[1-3]\d)\s*$/.test(data)){
				await tb.send(id,'生日格式错误，请重新输入(年月日，如: 2000/6/6):',[],{})
				return
			}
			delete state[uid]
			ft.ymd=data.split('/').map(_=>parseInt(_.trim()))
			ft.parse()
			await tb.send(id,`您的生日为：${ft.ymd.join('/')}\n\n生肖为：${ft.sx[1]}\n\n星座为：${ft.xz[1]}`,[],{})
			return
		}
		delete state[uid]
		if(as.includes(s)){
			if(!ft.ymd){
				state[uid]='szsr'
				await tb.send(id,'尚未设置生日，请输入(年月日，如: 2000/6/6):',[],{})
				return
			}
			const {text,imgs,btns}=await ft[s]()
			await tb.send(id,text,imgs,btns)
		}else if(bs.includes(s)){
			const {text,imgs,btns}=await cs[s]()
			await tb.send(id,text,imgs,btns)
		}
	}
	tb.msg({
		'设置生日':async(id,uid)=>{
			ft.ymd=null
			state[uid]='szsr'
			await _msg(id,uid)
		},
		'生肖性格':async(id,uid)=>{
			state[uid]='sxxg'
			await _msg(id,uid)
		},
		'生肖运势':async(id,uid)=>{
			state[uid]='sxys'
			await _msg(id,uid)
		},
		'星座简介':async(id,uid)=>{
			state[uid]='xzjj'
			await _msg(id,uid)
		},
		'星座运势':async(id,uid)=>{
			state[uid]='xzys'
			await _msg(id,uid)
		},
		'笑话':async(id,uid)=>{
			state[uid]='xh'
			await _msg(id,uid)
		},
		'好句':async(id,uid)=>{
			state[uid]='hj'
			await _msg(id,uid)
		},
		'诗词':async(id,uid)=>{
			state[uid]='sc'
			await _msg(id,uid)
		},
		'搜索歌曲':async(id,uid)=>{
			state[uid]='ssgq'
			await _msg(id,uid)
		},
		_:_msg
	})
	tb.cmd('fortune',async id=>{
		await tb.send(id,'根据您的生日，查询今日运势(生肖运势、星座运势)',[],{
			keyboard:[['设置生日','生肖性格','星座简介'],['生肖运势','星座运势']],resize_keyboard:true
		})
	})
	tb.cmd('music',async id=>{
		await tb.send(id,'歌曲大全',[],{
			keyboard:[['搜索歌曲']],resize_keyboard:true
		})
	})
	tb.cmd('news',async id=>{
		const n=await ns.list(1)
		if(n.length<1)return
		const {text,imgs,btns}=n[0]
		await tb.send(id,text,imgs,btns)
	})
	tb.cmd('clause',async id=>{
		await tb.send(id,'笑话、好句、诗词，等等',[],{
			keyboard:[['笑话','好句','诗词']],resize_keyboard:true
		})
	})

	tb.music_play=async(cid,mid,o)=>{
		const [id,title,performer]=o.split('_')
		const {lyrics,url}=await ms.src(id)
		await tb.bot.sendAudio(cid,url,{
			title,performer,caption:lyrics
		});
	}
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
	tb.cron(async()=>{
		const gs=Object.keys(tb.gm)
		await ns.wakeup()
		console.log('cron',tb.wait,gs.length)
		if(tb.wait||gs.length<1)return
		try{
			const s=await ns.list(20,true)
			if(s.length==0)return
			tb.wait=true
			for(const g of gs){
				for(const {text,imgs,btns} of s)await tb.send(g,text,imgs,btns)
			}
		}catch(e){
			console.error('❌ 推送失败:',e)
		}finally{
			tb.wait=false
		}
	})
})

const http=require('http')
const server=http.createServer((req,res)=>{
	res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'})
	res.end(`...`)
})
server.listen(3001,()=>{
	console.log(`🌐 Web服务器已启动`)
})

//全局错误处理
process.on('uncaughtException',e=>{
	console.error('💥 未捕获异常:',e)
})
process.on('unhandledRejection',(reason,promise)=>{
	console.error('💥 未处理的Promise拒绝:',reason)
})