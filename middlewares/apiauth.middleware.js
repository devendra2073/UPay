import user from "../schema/user.model.js"
const apiAuth=async(req,res,next)=>{
  try{
  let {api,MID,amount}=req.body;
  amount=parseFloat(amount)
  if(!api || !MID || !amount) return res.json({status:false,message:"Missing api or MID key or amount"})
  const usr=await user.findOne({api,MID})
  if(!usr) return res.json({status:false,message:"Account not found"})
  req.user=usr
  req.mode="PORTAL"
  req.amount=amount
  next()
  }
  catch(e){
    console.log(e.message)
    return res.json({status:false,message:"Something went wrong"})
  }
}
export default apiAuth;