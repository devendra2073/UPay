import { Schema, model } from "mongoose";

const couponSchema = new Schema({
  code: { type: String, required: true, uppercase: true, trim: true },
  type: { type: String, enum: ["PERCENT", "FLAT"], default: "PERCENT" },
  value: { type: Number, required: true },
  minOrder: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: 1000 },
  active: { type: Boolean, default: true },
  usageCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const paymentLinkSchema = new Schema({
  linkId: { type: String, required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String, default: "" },
  orderId: { type: String },
  url: { type: String },
  active: { type: Boolean, default: true },
  clicks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const withdrawalSchema = new Schema({
  wid: { type: String, required: true },
  amount: { type: Number, required: true },
  bankName: { type: String },
  accountLast4: { type: String },
  mode: { type: String, default: "IMPS" },
  status: { type: String, enum: ["COMPLETED", "PROCESSING", "FAILED"], default: "COMPLETED" },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new Schema({
  firstname: {
    type: String,
    required: true
  },
  lastname: {
    type: String
  },
  gender: {
    type: String
  },
  mobile: {
    type: String
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String
  },
  activationotp: {
    type: Number,
    required: true,
    default: 0
  },
  pic: {
    type: String
  },
  activationotpexpireat: {
    type: Number,
    default: () => Date.now() + 10 * 60 * 1000
  },
  resettoken: {
    type: String
  },
  resettokenexpireat: {
    type: Number
  },
  emailverified: {
    type: Boolean,
    default: false
  },
  wallet: {
    type: Number,
    default: 0
  },
  MID: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  api: {
    type: String,
    required: true,
    unique: true
  },
  bank: {
    bank: String,
    holder: String,
    account: String,
    ifsc: String,
    logo: String
  },
  aadhaar: {
    type: String
  },
  pan: {
    type: String
  },
  callback: {
    type: String
  },
  redirect: {
    type: String,
    default: "/pay/thanks"
  },
  company: {
    type: String,
    default: "Your Company Name"
  },
  otpblockedtime: {
    type: Number
  },
  paytm: {
    MID: String,
    UPI: String,
    fallbackUPI: String,
    autoFailover: { type: Boolean, default: true }
  },
  // New Admin & Checkout Theme Configuration
  checkoutConfig: {
    defaultTheme: { type: String, default: "phonepe" },
    allowCustomerThemeChange: { type: Boolean, default: true },
    allowCustomTheme: { type: Boolean, default: true },
    customTheme: {
      primary: { type: String, default: "#5f259f" },
      secondary: { type: String, default: "#7c3aed" },
      surface: { type: String, default: "#ffffff" },
      background: { type: String, default: "#f5f0ff" },
      text: { type: String, default: "#0f172a" },
      radius: { type: String, default: "24px" }
    },
    tagline: { type: String, default: "100% Safe & Instant UPI Checkout" },
    enableTips: { type: Boolean, default: true },
    enableCoupons: { type: Boolean, default: true },
    enableSplitBill: { type: Boolean, default: true },
    passFeeToCustomer: { type: Boolean, default: false },
    convenienceFeePercent: { type: Number, default: 0 },
    supportEmail: { type: String, default: "" },
    supportWhatsapp: { type: String, default: "" }
  },
  // Security & Operational Controls
  securityConfig: {
    maintenanceMode: { type: Boolean, default: false },
    ipWhitelist: { type: String, default: "" },
    minOrderAmount: { type: Number, default: 1 },
    maxOrderAmount: { type: Number, default: 100000 },
    autoSettleEnabled: { type: Boolean, default: false },
    autoSettleThreshold: { type: Number, default: 5000 }
  },
  coupons: {
    type: [couponSchema],
    default: [
      { code: "PHONEPE10", type: "PERCENT", value: 10, minOrder: 50, maxDiscount: 200, active: true },
      { code: "UPAYFLAT25", type: "FLAT", value: 25, minOrder: 100, maxDiscount: 25, active: true }
    ]
  },
  paymentLinks: {
    type: [paymentLinkSchema],
    default: []
  },
  withdrawals: {
    type: [withdrawalSchema],
    default: []
  }
});

const user = model("user", userSchema);
export default user;