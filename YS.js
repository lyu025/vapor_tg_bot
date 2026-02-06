class YS{
	static #o=null
	static O(B,C,R){
		if(!YS.#o)YS.#o=new YS(B,C,R)
		return YS.#o
	}
	constructor(B,C,R){
		this.B=B
		this.C=C
		this.R=R
	}
	init(){
		// 点击底部按钮
		this.B.H['今日运势']=async(id,uid,init=true)=>{
			if(!(uid in this.B.U))this.B.U[uid]={_:'jrys.今日运势.●'}
			this.B.U[uid]._='jrys.今日运势.●'
			
			const reg=/^\s*[1-9]\d{3}\s*\/\s*(0?[1-9]||1[0-2])\s*\/\s*(0?[1-9]||[1-3]\d)\s*$/
			let o=this.B.U[uid].jrys,wrong=o&&!reg.test(o)
			if(wrong)o=this.B.U[uid].jrys=null
			if(init)wrong=false
			if(!o){
				const text=wrong?'🔴, 生日格式错误，请重新输入(如:2002/06/21)：':'🍀 查询今日运势，输入您的生日(如:2002/06/21)：'
				await this.B.text(id,text)
				return
			}
			const {sr,sx,xz}=this.parse(o.split('/').map(_=>parseInt(_.trim())))
			await this.B.text(id,`🍀 您的生日为：${sr}\n\n生肖为：${sx[1]}　　星座为：${xz[1]}`,{
				inline_keyboard:[[
					{text:'生肖性格',callback_data:`jrys_sxxg.${sx[0]}_${sx[1]}:${xz[0]}_${xz[1]}`},
					{text:'生肖运势',callback_data:`jrys_sxys.${sx[0]}_${sx[1]}:${xz[0]}_${xz[1]}`},
					{text:'星座简介',callback_data:`jrys_xzjj.${sx[0]}_${sx[1]}:${xz[0]}_${xz[1]}`},
					{text:'星座运势',callback_data:`jrys_xzys.${sx[0]}_${sx[1]}:${xz[0]}_${xz[1]}`}
				]],resize_keyboard:true
			})
		}
		// 点击内联按钮
		this.B.H.jrys_sxxg=async(id,mid,o)=>await this.sxxg(id,...o.split('_').map(_=>_.split(':')))
		this.B.H.jrys_sxys=async(id,mid,o)=>await this.sxys(id,...o.split('_').map(_=>_.split(':')))
		this.B.H.jrys_xzjj=async(id,mid,o)=>await this.xzjj(id,...o.split('_').map(_=>_.split(':')))
		this.B.H.jrys_xzys=async(id,mid,o)=>await this.xzys(id,...o.split('_').map(_=>_.split(':')))
	}
	parse(ymd){
		if(!ymd)return
		const a=[['shu','子鼠'],['niu','丑牛'],['hu','寅虎'],['tu','卯兔'],['long','辰龙'],['she','巳蛇'],['ma','午马'],['yang','未羊'],['hou','申猴'],['ji','酉鸡'],['gou','戌狗'],['zhu','亥猪']]
		const b=[
			{n:['mojie','摩羯座'],d:'12.22-1.19'},{n:['shuiping','水瓶座'],d:'1.20-2.18'},
			{n:['shuangyu','双鱼座'],d:'2.19-3.20'},{n:['baiyang','白羊座'],d:'3.21-4.19'},
			{n:['jinniu','金牛座'],d:'4.20-5.20'},{n:['shuangzi','双子座'],d:'5.21-6.21'},
			{n:['juxie','巨蟹座'],d:'6.22-7.22'},{n:['shizi','狮子座'],d:'7.23-8.22'},
			{n:['chunv','处女座'],d:'8.23-9.22'},{n:['tiancheng','天秤座'],d:'9.23-10.23'},
			{n:['tianxie','天蝎座'],d:'10.24-11.22'},{n:['sheshou','射手座'],d:'11.23-12.21'},
		]
		const _d=[20,19,21,20,21,22,23,23,23,24,23,22]
		const [y,m,d]=ymd,i=m-(d<_d[m-1]?1:0)
		const sr=ymd.join('/'),sx=a[(y-4)%12],xz=b[i<0?11:i].n
		return {sr,sx,xz}
	}
	async sxxg(id,sx,xz){ // 生肖性格
		const url=`https://m.smxs.com/shengxiao/wenhua/${sx[0]}`
		let o=[],$=await this.R.get(url,{timeout:15000}).then(_=>this.C.load(_.data)).catch(_=>null)
		$('.xiaoxi_item').each((i,e)=>o.push(`<b>${$(e).text().trim()}</b>`))
		o=[`您的生肖为: <b>${sx[1]}</b>`,o.join(`\t\t\t`)]
		$('.yydesc').each((i,e)=>{
			const v=$(e).text().trim(),t=i<1?'':(i==1?`<b>性格优点：</b>`:`<b>性格缺点：</b>`)
			o.push(`\n${t}<em>${v}</em>`)
		})
		await this.B.text(id,o.join(`\n`),{
			inline_keyboard:[[
				{text:'生肖性格',callback_data:`jrys_sxxg.${sx[0]}_${sx[1]}`},
				{text:'生肖运势',callback_data:`jrys_sxys.${sx[0]}_${sx[1]}`},
				{text:'星座简介',callback_data:`jrys_xzjj.${xz[0]}_${xz[1]}`},
				{text:'星座运势',callback_data:`jrys_xzys.${xz[0]}_${xz[1]}`}
			]],resize_keyboard:true
		})
	}
	async sxys(id,sx,xz){ // 生肖运势
		const url=`https://m.smxs.com/shengxiaoriyun/${sx[0]}`
		let o=[],$=await this.R.get(url,{timeout:15000}).then(_=>this.C.load(_.data)).catch(_=>null)
		$('.hlinfoitem').each((i,e)=>o.push(`<b>${$(e).text().trim()}</b>`))
		o.push(`您的生肖为: <b>${sx[1]}</b>`)
		$('.sxysbox').each((i,e)=>{
			const $e=$(e),t=$e.find('.ystit').text().trim(),v=$e.find('.ysdesc').text().trim()
			o.push(`\n<b>${t}：</b><em>${v}</em>`)
		})
		await this.B.text(id,o.join(`\n`),{
			inline_keyboard:[[
				{text:'生肖性格',callback_data:`jrys_sxxg.${sx[0]}_${sx[1]}`},
				{text:'生肖运势',callback_data:`jrys_sxys.${sx[0]}_${sx[1]}`},
				{text:'星座简介',callback_data:`jrys_xzjj.${xz[0]}_${xz[1]}`},
				{text:'星座运势',callback_data:`jrys_xzys.${xz[0]}_${xz[1]}`}
			]],resize_keyboard:true
		})
	}
	async xzjj(id,sx,xz){ // 星座简介
		const url=`https://m.smxs.com/xingzuo/${xz[0]}.html`
		let o=[],$=await this.R.get(url,{timeout:15000}).then(_=>this.C.load(_.data)).catch(_=>null)
		$('.subs').each((i,e)=>{
			const $e=$(e),t=$e.find('.subs_title'+(i==0?'>small':'')).text().trim()
			let v=$e.find('.subs_main').text().trim()
			if(t.startsWith('关于'))return
			if(i<1){
				o.push(`<b>${t}</b>`)
				o.push(`\n<em>${v}</em>`)
				return
			}
			if(i==1)v=`\n`+v.replace(/ *\n */g,`       `).replace(/： */g,'☞').trim()
			o.push(`\n<b>${t}：</b><em>${v}</em>`)
		})
		await this.B.text(id,o.join(`\n`),{
			inline_keyboard:[[
				{text:'生肖性格',callback_data:`jrys_sxxg.${sx[0]}_${sx[1]}`},
				{text:'生肖运势',callback_data:`jrys_sxys.${sx[0]}_${sx[1]}`},
				{text:'星座简介',callback_data:`jrys_xzjj.${xz[0]}_${xz[1]}`},
				{text:'星座运势',callback_data:`jrys_xzys.${xz[0]}_${xz[1]}`}
			]],resize_keyboard:true
		})
	}
	async xzys(id,sx,xz){ // 星座运势
		const url=`https://m.smxs.com/xingzuoriyun/${xz[0]}`
		let o=[],$=await this.R.get(url,{timeout:15000}).then(_=>this.C.load(_.data)).catch(_=>null)
		o.push(`<b>${$('.xzlantit').text().trim()}</b>`)
		o.push(`<b>幸运颜色：</b>${$('.xzcldesc').text().trim()}`)
		o.push(`<b>速配星座：</b>${$('.xzspdesc').text().trim()}`)
		o.push(`<b>幸运数字：</b>${$('.xznumdesc').text().trim()}`)
		$('.ztysk,.aqysk,.cfysk,.syysk').each((i,e)=>{
			const $e=$(e),t=$e.find('.ztystit').text().trim(),v=$e.find('.ztysdesc').text().trim()
			o.push(`\n<b>${t}：</b><em>${v}</em>`)
		})
		await this.B.text(id,o.join(`\n`),{
			inline_keyboard:[[
				{text:'生肖性格',callback_data:`jrys_sxxg.${sx[0]}_${sx[1]}`},
				{text:'生肖运势',callback_data:`jrys_sxys.${sx[0]}_${sx[1]}`},
				{text:'星座简介',callback_data:`jrys_xzjj.${xz[0]}_${xz[1]}`},
				{text:'星座运势',callback_data:`jrys_xzys.${xz[0]}_${xz[1]}`}
			]],resize_keyboard:true
		})
	}
}
module.exports=YS