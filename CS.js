class CS{
	static #o=null
	static O(B,R){
		if(!CS.#o)CS.#o=new CS(B,R)
		return CS.#o
	}
	constructor(B,R){
		this.B=B
		this.R=R
	}
	init(){
		// 点击底部按钮
		this.B.H['随机段子']=async(id,uid)=>{
			if(!(uid in this.B.U))this.B.U[uid]={_:'sjdz.随机段子.○'}
			this.B.U[uid]._='sjdz.随机段子.○'
			
			const text='🪶 随机笑话、段子、诗词，点击下列按钮开始吧！'
			await this.B.text(id,text,{
				inline_keyboard:[[
					{text:'👻 笑话',callback_data:`sjdz_xh.`},
					{text:'🗯️ 好句',callback_data:`sjdz_hj.`},
					{text:'📜 诗词',callback_data:`sjdz_sc.`}
				]],resize_keyboard:true
			})
		}
		// 点击内联按钮
		this.B.H.sjdz_xh=async(id,mid,o)=>await this.xh(id)
		this.B.H.sjdz_hj=async(id,mid,o)=>await this.hj(id)
		this.B.H.sjdz_sc=async(id,mid,o)=>await this.sc(id)
	}
	async xh(id){ // 笑话
		const url='https://www.yduanzi.com/duanzi/getduanzi?_='+Date.now()
		const text=await this.R.get(url,{timeout:15000}).then(_=>JSON.parse(_.data).duanzi.replaceAll('<br>',`\n`).trim()).catch(_=>'稍等一下！')
		await this.B.text(id,text,{
			inline_keyboard:[[
				{text:'👻 笑话',callback_data:`sjdz_xh.`},
				{text:'🗯️ 好句',callback_data:`sjdz_hj.`},
				{text:'📜 诗词',callback_data:`sjdz_sc.`}
			]],resize_keyboard:true
		})
	}
	async hj(id){ // 好句
		const ua='https://v2.xxapi.cn/api/yiyan?type=hitokoto&_='+Date.now()
		let text=await this.R.get(ua,{timeout:15000}).then(_=>_.data.data).catch(_=>'')
		const ub='https://v2.xxapi.cn/api/dujitang?_='+Date.now()
		text+=await this.R.get(ub,{timeout:15000}).then(_=>(`\n\n`+_.data.data)).catch(_=>'')
		await this.B.text(id,text,{
			inline_keyboard:[[
				{text:'👻 笑话',callback_data:`sjdz_xh.`},
				{text:'🗯️ 好句',callback_data:`sjdz_hj.`},
				{text:'📜 诗词',callback_data:`sjdz_sc.`}
			]],resize_keyboard:true
		})
	}
	async sc(id){ // 诗词
		const url='https://tixbay.net/poeman/getPoemText?_='+Date.now()
		const text=await this.R.get(url,{timeout:15000}).then(_=>_.data).catch(_=>'稍等一下！')
		await this.B.text(id,text,{
			inline_keyboard:[[
				{text:'👻 笑话',callback_data:`sjdz_xh.`},
				{text:'🗯️ 好句',callback_data:`sjdz_hj.`},
				{text:'📜 诗词',callback_data:`sjdz_sc.`}
			]],resize_keyboard:true
		})
	}
}
module.exports=CS