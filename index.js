const NS=require('./news')
const TB=require('./bot')

const ns=new NS()
const tb=new TB()

tb.start().then(()=>{
	tb.cmd('news',async id=>{
		const n=(await ns.list()).shift()
		if(!n)return
		const {text,imgs,btns}=ns.build(n)
		await tb.send(id,text,imgs,btns)
	})
	tb.news_info=async(cid,mid,id)=>{
		await ns.info(id)
		const {text,imgs,btns}=ns.build(ns.m[id])
		await tb.edit(cid,mid,text,imgs,btns)
	}
	tb.news_index=async(cid,mid,o)=>{
		const [id,index]=o.split('_')
		const i=parseInt(index)
		if(ns.m[id].index===i)return
		ns.m[id].index=i
		const {text,imgs,btns}=ns.build(ns.m[id])
		await tb.edit(cid,mid,text,imgs,btns)
	}
	tb.cron(async()=>{
		const gm=tb.gm
		await ns.o()
		console.log('cron',tb.wait,Object.keys(gm).length)
		if(tb.wait)return
		if(Object.keys(gm).length==0)return
		try{
			const s=(await ns.list(true)).slice(0,20)
			if(s.length==0)return
			tb.wait=true
			const ss=[]
			for(const n of s){
				const {text,imgs,btns}=ns.build(n)
				ss.push({text,imgs,btns})
			}
			ss.reverse()
			for(const gid in gm){
				for(const v of ss){
					await tb.send(gid,v.text,v.imgs,v.btns)
					await tb.sleep(100)
				}
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