const cheerio=require('cheerio')
const axios=require('axios')

class FT{
	constructor(){
		this.ymd=this.sx=this.xz=null
	}
	parse(){
		if(!this.ymd)return
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
		const [y,m,d]=this.ymd,i=m-(d<_d[m-1]?1:0)
		this.sx=a[(y-4)%12]
		this.xz=b[i<0?11:i].n
	}
	async sxxg(){ // 生肖性格
		const x=await axios.get(`https://m.smxs.com/shengxiao/wenhua/${this.sx[0]}`,{timeout:15000})
		let $=cheerio.load(x.data),o=[]
		$('.xiaoxi_item').each((i,e)=>{
			o.push(`<b>${$(e).text().trim()}</b>`)
		})
		o=[`您的生肖为: <b>${this.sx[1]}</b>`,o.join(`\t\t\t`)]
		$('.yydesc').each((i,e)=>{
			const v=$(e).text().trim(),t=i<1?'':(i==1?`<b>性格优点：</b>`:`<b>性格缺点：</b>`)
			o.push(`\n${t}<em>${v}</em>`)
		})
		return {text:o.join(`\n`),imgs:[],btns:{}}
	}
	async sxys(){ // 生肖运势
		const x=await axios.get(`https://m.smxs.com/shengxiaoriyun/${this.sx[0]}`,{timeout:15000})
		const $=cheerio.load(x.data),o=[]
		$('.hlinfoitem').each((i,e)=>{
			o.push(`<b>${$(e).text().trim()}</b>`)
		})
		o.push(`您的生肖为: <b>${this.sx[1]}</b>`)
		$('.sxysbox').each((i,e)=>{
			const $e=$(e),t=$e.find('.ystit').text().trim(),v=$e.find('.ysdesc').text().trim()
			o.push(`\n<b>${t}：</b><em>${v}</em>`)
		})
		return {text:o.join(`\n`),imgs:[],btns:{}}
	}
	async xzjj(){ // 星座简介
		const x=await axios.get(`https://m.smxs.com/xingzuo/${this.xz[0]}.html`,{timeout:15000})
		const $=cheerio.load(x.data),o=[]
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
		return {text:o.join(`\n`),imgs:[],btns:{}}
	}
	async xzys(){ // 星座运势
		const x=await axios.get(`https://m.smxs.com/xingzuoriyun/${this.xz[0]}`,{timeout:15000})
		const $=cheerio.load(x.data),o=[]
		o.push(`<b>${$('.xzlantit').text().trim()}</b>`)
		o.push(`<b>幸运颜色：</b>${$('.xzcldesc').text().trim()}`)
		o.push(`<b>速配星座：</b>${$('.xzspdesc').text().trim()}`)
		o.push(`<b>幸运数字：</b>${$('.xznumdesc').text().trim()}`)
		$('.ztysk,.aqysk,.cfysk,.syysk').each((i,e)=>{
			const $e=$(e),t=$e.find('.ztystit').text().trim(),v=$e.find('.ztysdesc').text().trim()
			o.push(`\n<b>${t}：</b><em>${v}</em>`)
		})
		return {text:o.join(`\n`),imgs:[],btns:{}}
	}
	
}
module.exports=FT