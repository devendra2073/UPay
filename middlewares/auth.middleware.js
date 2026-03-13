import jwt from "jsonwebtoken"
import user from "../schema/user.model.js"
export const auth=async(req,res,next)=>{
  const {session}=req.cookies
  if (!session) return res.redirect("/user/login")
  const data=jwt.verify(session,process.env.JWT)
  if (!data) return res.redirect("/user/login")
  const info=await user.findOne({email:data.email});
  if(!info){
    res.clearCookie("session")
    return res.redirect("/user/login")
    
  }
  if(!info.emailverified) return res.redirect("/user/verify")
  req.user=info
next()
}
export const order=async(req,res,next)=>{
  let {amount}=req.body
  req.mode="UPI DEPOSIT"
  amount=parseFloat(amount)
  if (!amount) return res.json({success:false,message:"Invalid Amount"}) 
  req.amount=amount
  next()
}
export const resendOtp=async(req,res,next)=>{
  const {session}=req.cookies;
  if(!session) return res.json({status:false,message:"Unauthorized"})
  const decode=jwt.verify(session,process.env.JWT)
  if(!decode) return res.json({status:false,message:"Unauthorized"})
  const usr=await user.findOne({email:decode.email})
  if(!usr) return res.json({status:false,message:"Unauthorized"})
  if(usr.otpblockedtime){
    if(usr.otpblockedtime<Date.now()){
      req.user=usr
      return next()
    }
    return res.json({status:false,message:"OTP Exausted for your account.Please try after some time"})
  }
  req.user=usr
  return next()
  
  
  
  
}