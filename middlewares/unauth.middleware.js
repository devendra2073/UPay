import jwt from "jsonwebtoken"
const unauth=async(req,res,next)=>{
  const {session}=req.cookies
  if (!session) return next()
  const decoded=jwt.verify(session,process.env.JWT)
  if(!decoded) return next()
  return res.redirect("/user/dashboard")
  
}
export default unauth;