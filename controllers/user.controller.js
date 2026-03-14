import bcrypt from "bcryptjs"
import crypto from "crypto"
import mailer from "../utils/mailer.js"
import parser from "../utils/templateParser.js"
import payment from "../schema/payment.model.js"
import banks from "../utils/getBanks.js"
import jwt from "jsonwebtoken"
import user from "../schema/user.model.js"
export const genMID=(len=8)=>{
  let uid=""
  let list=["1","2","3","4","5","6","7","8","9","0","A","B","C","D","E","F","G","H","K","J"]
  for (let i = 0; i <len; i++) {
    let index=Math.floor(Math.random()*list.length)
    uid+=list[index]
  }
  return uid
}
export const register=async(req,res)=>{
  let {firstname,lastname,email,password}=req.body;
  firstname=firstname.trim()
  lastname=lastname.trim()
  password=password.trim()
  const check=await user.findOne({email}) 
  if(check) return res.json({success:false,message:"Email already exits.kindly login"})
  if(!firstname) return res.json({status:false,message:"Invalid Firstname"})
  if(!lastname) return res.json({status:false,message:"Invalid Lastname"})
  if(!password) return res.json({status:false,message:"Invalid Password"})
  if(password.length<6) return res.json({status:false,message:"Password should be at least 6 Char"})
  const MID=genMID()
  const buffer=await crypto.randomBytes(16)
  const api=buffer.toString("hex")
  const hashedPasword=await bcrypt.hash(password,10)
  const activationotp=100000+Math.floor(Math.random()*900000)
  const usr=new user({
    firstname,
    lastname,
    email,
    MID,
    api,
    activationotp,
    company:`${firstname} Enterprises`,
    password:hashedPasword
  })
  const token=await jwt.sign({MID,email},process.env.JWT,{expiresIn:"24h"})
  
  const nu=await usr.save()
  const html=await parser("otp",{firstname,otp:activationotp})
  await mailer({email,firstname,html,subject:"OTP for account activation"})
  res.cookie("session",token,{
    httpOnly:true
  })
  res.json({status:true,message:"Registration success",redirect:"/user/verify"})
}
export const loginPage=(req,res)=>{
  res.render("login")
}
export const login=async(req,res)=>{
  let {email,password}=req.body
  const data=await user.findOne({email})
  if (!data) return res.json({status:false,message:"Login failed"})
  const passcheck=await bcrypt.compare(password,data.password)
  if (!passcheck) return res.json({status:false,message:"Login failed"})
  const token=await jwt.sign({MID:data.MID,email},process.env.JWT,{expiresIn:"24h"})
  res.cookie("session",token,{
    httpOnly:true
  })
  if (!data.emailverified) return res.json({status:false,rdr:"/user/verify",message:"Please verify your account"})
  res.json({status:true,message:"Login success"})
}
export const verify=async(req,res)=>{
  const {session}=req.cookies
  const info=jwt.verify(session,process.env.JWT)
  if(!info) return res.json({status:false,message:"Token Expired or invalid"})
  
  const usr=await user.findOne({MID:info.MID,email:info.email})
  if (!usr) return res.json({status:false,message:"User doesn't exits.Kindly contact support"})
  if(usr.emailverified) return res.json({status:false,message:"User already verified"})
  let {otp}=req.body
  
  if(usr.activationotp==otp){
    usr.emailverified=true;
    usr.activationotp=-1;
    await usr.save()
    return res.json({status:true,message:"Verified"})
  }else{
    return res.json({status:false,message:"Invalid OTP"})
  }
  
  
  
}

export const verifyPage=async(req,res)=>{
  const {session}=req.cookies
  if(!session) return res.send("Token Expired or invalid")
  const info=jwt.verify(session,process.env.JWT)
  if(!info) return res.send("Token Expired or invalid")
  
  const usr=await user.findOne({MID:info.MID,email:info.email})
  if (!usr) {
    res.clearCookie("session")
    return res.send("User doesn't exits.Kindly contact support")
    
  }
  if(usr.emailverified) return res.redirect(301,"/user/dashboard")
  res.render("verify")
}
export const dashboard=async(req,res)=>{
  const list=await banks()
  res.render("dashboard",{user:req.user,list})
}

export const bank=async(req,res)=>{
  if (!req.user) return res.json({status:false,message:"Something went wrong"})
  const usr=await user.findOne({email:req.user.email})
  if(!usr) return res.json({status:true,message:"Something went wrong"})
  
  let {account,bank,ifsc,holder}=req.body;
  account=account.trim()
  ifsc=ifsc.trim()
  bank=bank.trim()
let  tholder=holder.trim()
  if(!account || !bank || !ifsc || !tholder) return res.json({status:true,message:"Please enter required detailes"})
  if(ifsc.length!=11) return res.json({status:false,message:"Invalid IFSC"})
  if(account.length<10) return res.json({status:false,message:"Invalid Account Number"})
  const blist=await banks()
  
  let {icon}=blist.find(bnk=>bnk.name==bank)
  let logo =icon || "/assets/bank.jpeg"
  usr.bank={
    bank,
    account,
    ifsc,
    holder,
    logo
  }
  await usr.save()
  return res.json({status:true,message:"Bank Saved"})
}



export const transections=async(req,res)=>{
  if(!req.user) return res.json({status:false,message:"Unauthorized"})
  const MID=req.user.MID
  if (!MID) return res.json({status:false,message:"Something went wrong"})
  const trans=await payment.find({MID,isPaid:true}).select('amount utr mode MID -_id').sort({_id:-1})
  return res.json(trans)
}

export const balance=async(req,res)=>{
  const {wallet}=req.user
  if (!wallet) return res.json({status:false,message:"Something went wrong"})
  return res.json({wallet})
}

export const profile=async(req,res)=>{
  let {company,firstname,lastname,mobile}=req.body;
  company=company.trim()
  firstname=firstname.trim()
  lastname=lastname.trim()
 let nm=mobile.trim()
  if (!firstname || !lastname || !company ||!nm) return res.json({status:false,message:"Missing Details"})
  console.log(nm.length)
  if(nm.length<10 || nm.length > 13) return res.json({status:false,message:"Invalid Mobile Number"})
  const {email}=req.user
  const usr=await user.findOne({email})
  usr.mobile=mobile
  usr.firstname=firstname
  usr.lastname=lastname
  usr.company=company
  await usr.save()
  return res.json({status:true,message:"Profile Updated"})
  
}

export const callback=async(req,res)=>{
  try {
    const {callback,redirect}=req.body
    if(!callback.startsWith("http") || !redirect.startsWith("http")) return res.json({status:false,message:"Invalid callback url or redirect url"})
    const {email}=req.user
    const usr=await user.findOne({email})
    usr.callback=callback,
    usr.redirect=redirect
    await usr.save()
    return res.json({status:true,message:"Callback registered"})
  } catch (e) {
    console.log(e)
    return res.json({status:true,message:"Something went wrong"})
  }
}
export const forgot=(req,res)=>{
  res.render("forgot")
}
export const sendResetMail=async(req,res)=>{
  const {email}=req.body;
  if(!email) return res.json({status:false,message:"Missing Details"})
  const usr=await user.findOne({email})
  if (!usr) return res.json({status:false,message:"Unauthorized"})
  usr.resettokenexpireat=Date.now()+60*60*60;
  const byte=crypto.randomBytes(25)
  const token=byte.toString("hex")
  const link=`http://localhost:8000/user/reset/${token}`
  usr.resettoken=token
  const html=await parser("reset",{firstname:usr.firstname,link})
  await mailer({email:usr.email,firstname:usr.firstname,html,subject:"Reset your Upay password"})
  await usr.save()
  return res.json({status:true,message:"Reset mail sent successfully"})
}
export const reset=async(req,res)=>{
  const {token}=req.params
  if(!token) return res.render("invalid")
  const usr=await user.findOne({resettoken:token})
  if(!usr) return res.render("invalid")
  if(usr.resettokenexpireat>Date.now()){
    const data=await jwt.sign({token},process.env.JWT,{expiresIn:"1h"})
    return res.render("reset",{data})
  }
  return res.render("invalid")
}

export const updatePassword=async(req,res)=>{
  const {password,confirmPassword,token}=req.body;
  if(!password || !confirmPassword || !token) return res.render("wrong")
  if(password.length<8) return res.json({status:true,message:"Less Secured Password"})
  if(password!=confirmPassword) return res.json({status:true,message:"Password doesn't match"})
  const decode=await jwt.verify(token,process.env.JWT)
  if(!decode) return res.render("wrong")
  const usr=await user.findOne({resettoken:decode.token})
  if (!usr) return res.render("wrong")
  if(usr.resettokenexpireat>Date.now()){
    usr.resettokenexpireat=0;
    usr.resettoken=""
    const hashPass=await bcrypt.hash(password,10)
    usr.password=hashPass;
    await usr.save()
    return res.render("passupdated")
    
    
  }
  return res.render("wrong")
}
export const resend=async(req,res)=>{
  const {email}=req.user
  if(!email) return res.json({status:false,message:"Unauthorized"})
  const usr=await user.findOne({email})
  if(!usr) return res.json({status:false,message:"Unauthorized"})
  const activationotp=100000+Math.floor(Math.random()*900000)
  usr.activationotp=activationotp;
  usr.activationotpexpireat=Date.now()+600000
  const {firstname}=usr
  const html=await parser("otp",{firstname,otp:usr.activationotp});
  await mailer({email,firstname,html,subject:"OTP for Upay Account Activation"})
  await usr.save()
  const firstp=usr.email.split("@")[0]
  const msk=`${firstp.slice(0,3)}xxxxx${firstp.slice(-1)}`
  const maskmail=`${msk}@${usr.email.split("@")[1]}`
  return res.json({status:true,message:`OTP Send to ${maskmail}`})
}

export const logout=async(req,res)=>{
  res.clearCookie("session")
  res.status(301).redirect("/user/login")
}
export const paytmconf=async(req,res)=>{
  if(req.user?.paytm?.MID) return res.render("paytmconf",{paytm:req.user.paytm})
  return res.render("paytmconf")
}
export const paytmcnf=async(req,res)=>{
  const {MID,UPI}=req.body
  if(!MID || !UPI) return res.json({status:false,message:"Invalid Details"})
  const usr=await user.findOne({email:req.user.email})
  usr.paytm={MID,UPI}
  await usr.save()
  res.json({status:true,message:"Configuration Done Please Deposit an amount to check that your PG is working or not"})
}
