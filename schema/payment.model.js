import { Schema, model } from "mongoose";

const paymentSchema = new Schema({
  order: {
    type: String,
    required: true,
    unique: true
  },
  logo: {
    type: String
  },
  mode: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  baseAmount: {
    type: Number
  },
  amount: {
    required: true,
    type: Number
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  couponCode: {
    type: String,
    default: ""
  },
  tipAmount: {
    type: Number,
    default: 0
  },
  feeAmount: {
    type: Number,
    default: 0
  },
  isPaid: {
    type: Boolean,
    required: true,
    default: false
  },
  status: {
    type: String,
    enum: ["PENDING", "PAID", "FAILED", "REFUND_REQUESTED", "REFUNDED"],
    default: "PENDING"
  },
  utr: {
    type: String
  },
  submittedUtr: {
    type: String,
    default: ""
  },
  created_at: {
    type: Date,
    default: () => Date.now(),
    required: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 5 * 60 * 1000)
  },
  MID: {
    type: String,
    required: true
  },
  lastCheckedAt: {
    type: Date,
    default: null
  },
  upaytr: {
    type: String,
    unique: true,
    required: true
  },
  customerName: {
    type: String,
    default: "Not Given"
  },
  customerEmail: {
    type: String,
    default: "Not Given"
  },
  customerPhone: {
    type: String,
    default: "Not Given"
  },
  customerNote: {
    type: String,
    default: ""
  },
  upi_address: {
    type: String
  },
  paymentDate: {
    type: Date
  },
  callback: {
    type: String
  },
  redirect: {
    type: String
  },
  api_response: {
    type: String
  },
  paytm: {
    MID: String,
    UPI: String
  },
  selectedTheme: {
    type: String,
    default: "upay2"
  },
  feedback: {
    rating: { type: Number, default: 0 },
    comment: { type: String, default: "" },
    submittedAt: { type: Date }
  },
  dispute: {
    raised: { type: Boolean, default: false },
    utr: { type: String, default: "" },
    reason: { type: String, default: "" },
    screenshot: { type: String, default: "" },
    status: { type: String, enum: ["NONE", "OPEN", "RESOLVED", "REFUNDED", "REJECTED"], default: "NONE" },
    adminNote: { type: String, default: "" },
    createdAt: { type: Date }
  }
});

const paymentModel = model("payment", paymentSchema);
export default paymentModel;
