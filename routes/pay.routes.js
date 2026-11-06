import express from "express";
import {
  paymentPage,
  paymentStatus,
  thanks,
  applyCoupon,
  applyTip,
  submitManualUtr,
  refreshPaymentQr,
  updateCustomerInfo,
  submitPaymentFeedback,
  raisePaymentDispute,
  setPaymentTheme
} from "../controllers/pay.controller.js";

const router = express.Router();

router.get("/thanks", thanks);
router.get("/:tid", paymentPage);
router.get("/status/:ORDERID", paymentStatus);

// Customer Checkout Interactive APIs (Zero Page Reload)
router.post("/api/:tid/coupon", applyCoupon);
router.post("/api/:tid/tip", applyTip);
router.post("/api/:tid/verify-utr", submitManualUtr);
router.post("/api/:tid/refresh-qr", refreshPaymentQr);
router.post("/api/:tid/customer-info", updateCustomerInfo);
router.post("/api/:tid/feedback", submitPaymentFeedback);
router.post("/api/:tid/dispute", raisePaymentDispute);
router.post("/api/:tid/theme", setPaymentTheme);

export default router;