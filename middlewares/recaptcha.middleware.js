import axios from "axios"
import log from "../utils/logger.js"
const recaptcha=async(req,res,next)=>{
  try{
    const captcha=req.body["g-recaptcha-response"]
    const privateKey=process.env.RECAPTCHA
    if(!captcha) return res.json({status:false,message:"Captcha verification failed"})
    if(!privateKey) return res.json({status:false,message:"Server Error in Recaptcha Auth"})
    const resp=await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${privateKey}&response=${captcha}`)
    console.log(resp.data)
    if(resp.data.success) return next()
    return res.json({status:false,message:"Recaptcha failed"})
    
    
    
    
  }catch(e){
    log(req,e.message)
    res.json({status:false,message:"Recaptcha Error"})
  }
}
export default recaptcha;