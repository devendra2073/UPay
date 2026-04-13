import payment from "../schema/payment.model.js"
export const paymentStatus=async(req,res)=>{
  const user=req.user;
  const ORDERID=req.body.orderid;

  if(!ORDERID) return res.json({status:false,message:"Invalid OrderID"})
  const info =await payment.findOne({order:ORDERID,MID:user.MID})
  if(!info) return res.json({status:false,message:"Invalid ORDERID"})
  if(!info.isPaid) return res.json({status:false,message:"Payment Not Found in our record"})
  const data={
    amount:info.amount,
    utr:info.utr,
    order:info.order,
    isPaid:info.isPaid,
    created_at:info.created_at
  }
  return res.json(data)
  
}