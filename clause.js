const axios=require('axios')

class CS{
	async xh(){ // 笑话
		const x=await axios.get('https://www.yduanzi.com/duanzi/getduanzi?_='+Date.now(),{timeout:15000})
		return {text:JSON.parse(x.data).duanzi.replaceAll('<br>',`\n`).trim(),imgs:[],btns:{}}
	}
	async hj(){ // 好句
		let x=await axios.get('https://v2.xxapi.cn/api/yiyan?type=hitokoto&_='+Date.now(),{timeout:15000})
		let text=x.data.data
		x=await axios.get('https://v2.xxapi.cn/api/dujitang?_='+Date.now(),{timeout:15000})
		text+=`\n\n`+x.data.data
		return {text,imgs:[],btns:{}}
	}
	async sc(){ // 诗词
		const x=await axios.get('https://tixbay.net/poeman/getPoemText?_='+Date.now(),{timeout:15000})
		return {text:x.data,imgs:[],btns:{}}
	}
	
}
module.exports=CS