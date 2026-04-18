import paymentModel from "../schema/payment.model.js"
const createOrder=async(req,res)=>{
  const {MID,company,redirect,pic,paytm,callback}=req.user;
  const paytmdata={MID:paytm.MID?paytm.MID:process.env.mid,UPI:paytm.UPI?paytm.UPI:process.env.upi}
  const amount=req.amount || req.body.amount;
const mode=req.mode
const logo=pic?pic:`https://ui-avatars.com/api/?background=random&size=128&name=${company}`
  const order=`ORDER${Date.now()}${Math.floor(Math.random()*1000)}`
  const pay=new paymentModel({
    order,
    logo,
    amount,
    MID,
    mode,
    company,
    redirect,
    callback,
    paytm:paytmdata
  })
  await pay.save()
  res.json({status:true,order,message:"Order Created",link:"https://u-pay-seven.vercel.app/pay/"+order,timestamp:Date.now()})
}

export default createOrder;
