import {Router} from "express"
import {auth,order,resendOtp} from "../middlewares/auth.middleware.js"
import recaptcha from "../middlewares/recaptcha.middleware.js"
import pay from "../controllers/payment.controller.js"
import unauth from "../middlewares/unauth.middleware.js"
import {loginPage,register,login,verify,verifyPage,dashboard,bank,transections,balance,profile,callback,forgot,sendResetMail,reset,updatePassword,resend,logout} from "../controllers/user.controller.js"
import SignIn from "../controllers/GOauth.js"
const router=Router()
router.use("/login",unauth)
router.get("/login",loginPage)
router.get("/verify",verifyPage)
router.post("/verify",verify)
router.use("/login",recaptcha)
router.post("/login",login)
router.get("/logout",logout)
router.post("/SignInWithGoogle",SignIn)
router.get("/reset/:token",reset)
router.use("/register",recaptcha)
router.post("/register",register)
router.post("/reset-password-action",updatePassword)
router.use("/resend-otp",resendOtp)
router.post("/resend-otp",resend)
router.use("/dashboard",auth)
router.get("/dashboard",dashboard)
router.get("/dashboard/transections",transections)
router.get("/dashboard/balance",balance)
router.post("/dashboard/bank",bank)
router.post("/dashboard/profile",profile)
router.post("/dashboard/callback",callback)
router.use("/dashboard/create-order",order)
router.post("/dashboard/create-order",pay)
router.get("/forgot-password",forgot)
router.use("/forgot-password/submit",recaptcha)
router.use("/forgot-password/submit",sendResetMail)

export default router;