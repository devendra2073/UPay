import {OAuth2Client} from "google-auth-library"
import fs from 'fs/promises'
import crypto from "crypto"
import path from "path"
import user from "../schema/user.model.js"
import log from "../utils/logger.js"
import jwt from "jsonwebtoken"
import {genMID} from "../controllers/user.controller.js"
const SignIn=async(req,res)=>{
  const {idToken}=req.body
  if(!idToken) return res.json({status:false,message:"UnAuthorized"})
  const CLIENT_ID="382846360562-rvchitsflgo2tnmqlk5o7ueps7p877kt.apps.googleusercontent.com"
  try {
    const client=new OAuth2Client(CLIENT_ID)
    const ticket=await client.verifyIdToken({
      idToken,
      audience:CLIENT_ID
    })
    const payload=ticket.getPayload()
    const exuser=await user.findOne({email:payload.email})
    if(!exuser){
      const MID=genMID();
      const buffer=await crypto.randomBytes(16)
    const api=buffer.toString("hex")
    const rd=await fetch(payload.picture)
    const blb=await rd.blob()
    const arb=blb.arrayBuffer()
    const buff=Buffer.from(arb)
    const fn= crypto.randomBytes(20)
    const filename=fn.toString("hex")+"."+blb.type.split("/")[1]
    await fs.writeFile(path.join(import.meta.dirname,'../public/assets/',filename),buff)
    const usr=new user({
      email:payload.email,
      firstname:payload.given_name,
      lastname:payload.family_name,
      pic:`/assets/${filename}`,
      api,
      MID,
      company:`${payload.given_name} Enterprises`,
      emailverified:true
    })
    await usr.save()
    const token=jwt.sign({email:payload.email,MID},process.env.JWT,{expiresIn:"24h"})
    res.cookie("session",token,{
      httpOnly:true
    })
    return res.json({status:true,message:"Account Created"})
    }
    const {email,MID}=exuser;
    const tokn=jwt.sign({email,MID},process.env.JWT,{expiresIn:"24h"})
    res.cookie("session",tokn,{
      httpOnly:true
    })
    return res.json({status:true,message:"Signing In..."})
    
  } catch (e) {
    console.log(e)
    log(req,e.message)
    return res.json({status:false,message:"Something went wrong"})
  }
}
export default SignIn;