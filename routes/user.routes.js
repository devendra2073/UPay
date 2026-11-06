import { Router } from "express";
import { auth, order, resendOtp } from "../middlewares/auth.middleware.js";
import recaptcha from "../middlewares/recaptcha.middleware.js";
import pay from "../controllers/payment.controller.js";
import unauth from "../middlewares/unauth.middleware.js";
import {
  loginPage,
  register,
  login,
  verify,
  verifyPage,
  dashboard,
  bank,
  transections,
  balance,
  profile,
  callback,
  forgot,
  sendResetMail,
  reset,
  updatePassword,
  resend,
  logout,
  paytmconf,
  paytmcnf,
  transaction,
  transactionApi,
  saveThemeConfig,
  manageCoupons,
  managePaymentLinks,
  manageRefunds,
  rotateApiKey,
  saveSecurityConfig,
  testWebhook,
  withdrawFunds,
  getCustomersList,
  simulateSandboxPayment,
  getAnalyticsSummary
} from "../controllers/user.controller.js";
import SignIn from "../controllers/GOauth.js";

const router = Router();

router.use("/login", unauth);
router.get("/login", loginPage);
router.get("/verify", verifyPage);
router.post("/verify", verify);
router.use("/login", recaptcha);
router.post("/login", login);
router.get("/logout", logout);
router.post("/logout", (req, res) => {
  res.clearCookie("session");
  res.json({ status: true, redirect: "/user/login" });
});
router.post("/SignInWithGoogle", SignIn);
router.get("/reset/:token", reset);
router.use("/register", recaptcha);
router.post("/register", register);
router.post("/reset-password-action", updatePassword);
router.use("/resend-otp", resendOtp);
router.post("/resend-otp", resend);

// Authenticated Admin Dashboard & SPA API Endpoints
router.use("/dashboard", auth);
router.get("/dashboard", dashboard);
router.get("/dashboard/transections", transections);
router.get("/dashboard/paytm", paytmconf);
router.post("/dashboard/paytm", paytmcnf);
router.get("/dashboard/balance", balance);
router.post("/dashboard/bank", bank);
router.get("/dashboard/transaction/:upaytr", transaction);
router.get("/dashboard/api/transaction/:upaytr", transactionApi);
router.post("/dashboard/profile", profile);
router.post("/dashboard/callback", callback);

// 10+ New Admin Panel APIs (Zero Page Reload)
router.post("/dashboard/theme-config", saveThemeConfig);
router.post("/dashboard/coupons", manageCoupons);
router.post("/dashboard/payment-links", managePaymentLinks);
router.post("/dashboard/refunds", manageRefunds);
router.post("/dashboard/rotate-api-key", rotateApiKey);
router.post("/dashboard/security", saveSecurityConfig);
router.post("/dashboard/test-webhook", testWebhook);
router.post("/dashboard/withdraw", withdrawFunds);
router.get("/dashboard/customers", getCustomersList);
router.post("/dashboard/simulate-payment", simulateSandboxPayment);
router.get("/dashboard/analytics", getAnalyticsSummary);

router.use("/dashboard/create-order", order);
router.post("/dashboard/create-order", pay);

router.get("/forgot-password", forgot);
router.use("/forgot-password/submit", recaptcha);
router.use("/forgot-password/submit", sendResetMail);

export default router;
