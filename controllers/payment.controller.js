import {auth}from "../middlewares/auth.middleware.js"
import paymentModel from "../schema/payment.model.js"
const createOrder=async(req,res)=>{
  const {MID,company,redirect}=req.user;
  const amount=req.amount;
const mode=req.mode
  const order=`ORDER${Date.now()}${Math.floor(Math.random()*1000)}`
  const pay=new paymentModel({
    order,
    amount,
    MID,
    mode,
    company,
    redirect
  })
  await pay.save()
  res.json({status:true,order,message:"Order Created",link:"http://localhost:8000/pay/"+order,timestamp:Date.now()})
}

export default createOrder;
