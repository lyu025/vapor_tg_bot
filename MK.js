class MK{
	static #o=null
	static O(B,C,R){
		if(!MK.#o)MK.#o=new MK(B,C,R)
		return MK.#o
	}
	constructor(B,C,R){
		this.A='bG9kZXN0YXI6cHVnc25heA=='
		this.B=B
		this.C=C
		this.R=R
	}
	init(){
		// 点击底部按钮
		this.B.H['市场行情']=async(id,uid)=>{
			if(!(uid in this.B.U))this.B.U[uid]={_:'schq.市场行情.○'}
			this.B.U[uid]._='schq.市场行情.○'
			
			const text='🐳 外汇汇率、贵金属价格、虚拟币价格，点击下列按钮开始吧！'
			await this.B.text(id,text,{
				inline_keyboard:[[
					{text:'🪙 汇率',callback_data:`schq_hl.`},
					{text:'🧽 贵金属',callback_data:`schq_gjs.`},
					{text:'💠 虚拟币',callback_data:`schq_xnb.`},
				]],resize_keyboard:true
			})
		}
		// 点击内联按钮
		this.B.H.schq_hl=async(id,mid,o)=>await this.hl(id,mid)
		this.B.H.schq_gjs=async(id,mid,o)=>await this.gjs(id,mid)
		this.B.H.schq_xnb=async(id,mid,o)=>await this.xnb(id,mid)
	}
	async hl(id,mid){ // 外汇汇率
		const M={USD:'美元',EUR:'欧元',GBP:'英镑',JPY:'日元',KRW:'韩元',AUD:'澳元',HKD:'港币',RUB:'俄卢布',PHP:'菲披索',CNH:'离岸人民币',CNY:'人民币'}
		const Q=Object.keys(M).filter(_=>_!='CNY').map(_=>`currencyPairs=${_}%2FCNY`).join('&')
		const url=`https://www.xe.com/api/protected/live-currency-rates/?${Q}&_=`+Date.now()
		const s=await this.R.get(url,{
			timeout:15000,
			headers:{Authorization:'Basic '+this.A}
		}).then(_=>_.data.map(({from,to,rate})=>`${M[from]} → ${M[to]}：${parseFloat(rate.toFixed(3))}`)).catch(_=>['数据获取失败！'])
		const text='🐳 当前外汇汇率：\n\n'+s.join('\n')
		await this.B.edit_text(id,mid,text,{
			inline_keyboard:[[
				{text:'🪙 汇率',callback_data:`schq_hl.`},
				{text:'🧽 贵金属',callback_data:`schq_gjs.`},
				{text:'💠 虚拟币',callback_data:`schq_xnb.`},
			]],resize_keyboard:true
		})
	}
	async gjs(id,mid){ // 贵金属价格
		const M={XPD:'钯(1盎司)',XPT:'铂(1盎司)',XAU:'金(1盎司)',XAG:'银(1盎司)',CNY:'人民币'}
		const Q=Object.keys(M).filter(_=>_!='CNY').map(_=>`currencyPairs=${_}%2FCNY`).join('&')
		const url=`https://www.xe.com/api/protected/live-currency-rates/?${Q}&_=`+Date.now()
		const s=await this.R.get(url,{
			timeout:15000,
			headers:{Authorization:'Basic '+this.A}
		}).then(_=>_.data.map(({from,to,rate})=>`${M[from]} → ${M[to]}：${parseFloat(rate.toFixed(3))}`)).catch(_=>['数据获取失败！'])
		const text='🐳 当前贵金属价格：\n\n'+s.join('\n')
		await this.B.edit_text(id,mid,text,{
			inline_keyboard:[[
				{text:'🪙 汇率',callback_data:`schq_hl.`},
				{text:'🧽 贵金属',callback_data:`schq_gjs.`},
				{text:'💠 虚拟币',callback_data:`schq_xnb.`},
			]],resize_keyboard:true
		})
	}
	async xnb(id,mid){ // 虚拟币价格
		const M={BTC:'比特币',ETH:'以太坊',BCH:'B现金',LTC:'莱特币',DOGE:'狗狗币',CNY:'人民币'}
		const Q=Object.keys(M).filter(_=>_!='CNY').map(_=>`currencyPairs=${_}%2FCNY`).join('&')
		const url=`https://www.xe.com/api/protected/live-currency-rates/?${Q}&_=`+Date.now()
		const s=await this.R.get(url,{
			timeout:15000,
			headers:{Authorization:'Basic '+this.A}
		}).then(_=>_.data.map(({from,to,rate})=>`${M[from]} → ${M[to]}：${parseFloat(rate.toFixed(3))}`)).catch(_=>['数据获取失败！'])
		const text='🐳 当前虚拟币价格：\n\n'+s.join('\n')
		await this.B.edit_text(id,mid,text,{
			inline_keyboard:[[
				{text:'🪙 汇率',callback_data:`schq_hl.`},
				{text:'🧽 贵金属',callback_data:`schq_gjs.`},
				{text:'💠 虚拟币',callback_data:`schq_xnb.`},
			]],resize_keyboard:true
		})
	}
}
module.exports=MK