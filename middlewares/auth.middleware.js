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