import {Router} from "express"
import {auth,order} from "../middlewares/auth.middleware.js"
import pay from "../controllers/payment.controller.js"
import unauth from "../middlewares/unauth.middleware.js"
import {loginPage,register,login,verify,verifyPage,dashboard,bank,transections,balance,profile,callback} from "../controllers/user.controller.js"
const router=Router()
router.use("/login",unauth)
router.get("/login",loginPage)
router.get("/verify",verifyPage)
router.post("/verify",verify)
router.post("/login",login)
router.post("/register",register)
router.use("/dashboard",auth)
router.get("/dashboard",dashboard)
router.get("/dashboard/transections",transections)
router.get("/dashboard/balance",balance)
router.post("/dashboard/bank",bank)
router.post("/dashboard/profile",profile)
router.post("/dashboard/callback",callback)
router.use("/dashboard/create-order",order)
router.post("/dashboard/create-order",pay)

export default router;