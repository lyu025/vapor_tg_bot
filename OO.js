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
const mk=require('./MK').O(bt,C,R)
const mc=require('./MC').O(bt,C,R)

bt.start().then(async()=>{
	// 类初始化
	cs.init()
	zx.init()
	ys.init()
	mk.init()
	mc.init()
	// 初始化命令
	bt.cmd('start',id=>bt.text(id,'💥 欢迎使用Vapor助手！',{
		keyboard:[['动态资讯','今日运势','随机段子'],['歌曲检索','市场行情']],
		resize_keyboard:true
	}))
	// 定时服务唤醒,10秒一次
	T.schedule('*/10 * * * * *',async()=>{
		const url='https://vapor-tg-bot.onrender.com'
		await R.get(url,{timeout:1000}).catch(()=>null)
	},{scheduled:true,timezone:'Asia/Shanghai'}).start()
	// 定时拉取资讯,两分钟一次
	const t_zx=async()=>{
		Object.values(zx.O).forEach(async([k,v])=>{
			if(v)await zx['list_'+k]()
		})
	}
	T.schedule('*/2 * * * *',t_zx,{scheduled:true,timezone:'Asia/Shanghai'}).start()
	await t_zx()
	
})

// Web服务
H.createServer((_,P)=>{
	P.writeHead(200,{'Content-Type':'text/html;charset=utf-8'})
	P.end(`<img src='https://s1.aigei.com/src/img/gif/59/59bea5604f3445b0aefb640dd559f0ad.gif?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:5k9EcmB0kwPvUgwhLjKKCLZdg_I='/>`)
}).listen(3001,()=>{
	console.log(`🌐 Web服务器已启动！`)
})

