import {Schema,model} from "mongoose";
const paymentSchema=new Schema({
  order:{
    type:String,
    required:true,
    unique:true,
  },
  logo:{
    type:String
  },
  mode:{
    type:String,
    required:true,
  },
  company:{
    type:String,
    required:true,
  },
  amount:{
    required:true,
    type:Number
  },
  isPaid:{
    type:Boolean,
    required:true,
    default:false,
  },
  utr:{
    type:String
  },
  created_at:{
    type:Date,
    default:Date.now(),
    required:true,
  },
  MID:{
    type:String,
    required:true,
  },
  lastCheckedAt: {
  type: Date,
  default: null
}
,
  upaytr:{
    type:String,
    unique:true,
    required:true
  },
  customerName:{
    type:String,
    default:"Not Given"
  },
  customerEmail:{
    type:String,
    default:"Not Given"
  },
  customerPhone:{
    type:String,
    default:"Not Given"
  },
  upi_address:{
    type:String
  },
  callback:{
    type:String,
    
  },
  redirect:{
    type:String
  },
  api_response:{
    type:String,
  },
  paytm:{
    MID:String,
    UPI:String
  }
})
const paymentModel=model("payment",paymentSchema);
export default paymentModel;
