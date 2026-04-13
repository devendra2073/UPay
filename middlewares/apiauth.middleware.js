import user from "../schema/user.model.js"
const apiAuth=async(req,res,next)=>{
  try{
  let {api,MID}=req.body;
  
  if(!api || !MID ) return res.json({status:false,message:"Missing api or MID key "})
  const usr=await user.findOne({api,MID})
  if(!usr) return res.json({status:false,message:"Account not found"})
  req.user=usr
  req.mode="PORTAL"

  next()
  }
  catch(e){
    console.log(e.message)
    return res.json({status:false,message:"Something went wrong"})
  }
}
export default apiAuth;