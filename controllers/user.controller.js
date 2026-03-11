import bcrypt from "bcryptjs"
import crypto from "crypto"
import mailer from "../utils/mailer.js"
import parser from "../utils/templateParser.js"
import payment from "../schema/payment.model.js"
import banks from "../utils/getBanks.js"
import jwt from "jsonwebtoken"
import user from "../schema/user.model.js"
const genMID=(len=8)=>{
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