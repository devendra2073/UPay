import paymentModel from "../schema/payment.model.js"
import user from "../schema/user.model.js"
import jwt from "jsonwebtoken"
export const paymentPage=async(req,res)=>{
  const {tid}=req.params;
  const info=await paymentModel.findOne({order:tid,isPaid:false})
  if (!info){
    return res.json({status:false,message:"Unauthorized order"})
  }
  const upi=info?.paytm?.UPI?info.paytm.UPI:process.env.upi
  const {amount,company,logo}=info
  const redirect=info.redirect || "/pay/thanks"
  
  const intent=`upi://pay?pa=${upi}&tr=${tid}&am=${amount}&pn=${company}&tn=Don't Try to modify amount`
  const response=await fetch("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data="+encodeURIComponent(intent))
  const blob=await response.arrayBuffer()
  const buffer=Buffer.from(blob)
  const obj="data:image/png;base64, "+ buffer.toString('base64')
  res.render("index",{intent,obj,amount,company,tid,redirect,logo})
  
}

export const paymentStatus=async(req,res)=>{
  const {ORDERID}=req.params
  if(!ORDERID){
    res.json({status:false,message:"Unauthorized"})
  }
  const dbresp=await paymentModel.findOne({order:ORDERID,isPaid:false})
  const amount=dbresp?.amount
  const callback=dbresp?.callback
  const PAYTM="https://securegw.paytm.in/merchant-status/getTxnStatus?JsonData="
  const PAYTMMID=dbresp?.paytm?.MID?dbresp.paytm.MID:process.env.mid;
  if(!PAYTMMID) res.json({status:false,message:"Internal Server Error ",errorCode:2})
  const data=PAYTM+JSON.stringify({MID:PAYTMMID,ORDERID})
  const response=await fetch(data)
 const info=await response.json()
  if(info.STATUS=="TXN_SUCCESS" && parseFloat(info.TXNAMOUNT)==parseFloat(amount)){
    dbresp.isPaid=true;
    dbresp.api_response=JSON.stringify(info)
    dbresp.utr=info.BANKTXNID
    await dbresp.save()
    const usr=await user.findOne({MID:dbresp.MID})
    if (!usr) return res.json({status:false,message:"Something went wrong"})
    usr.wallet+=amount;
    await usr.save()
    if (callback){
      await fetch(callback,{
        method:'post',
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          ORDERID,
          amount,
          UTR:info.BANKTXNID
        })
      })
    }
    const payinfo=jwt.sign({amount,ORDERID},process.env.JWT,{expiresIn:"1h"})
    res.cookie("payment_session",payinfo,{
      httpOnly:true
    })
    res.json({status:true,utr:info.BANKTXNID})
  }
  else{
    res.json({status:false})
  }
  
}
export const thanks=async(req,res)=>{
  const cookie=req.cookies?.payment_session
  try{
    const {amount,ORDERID}=jwt.verify(cookie,process.env.JWT)
    res.render("thanks",{amount,ORDERID})
  }catch(e){
    res.send("Something went wrong!")
  }
  
}
