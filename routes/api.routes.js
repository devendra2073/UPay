import express from "express"
import auth from "../middlewares/apiauth.middleware.js"
import orderCreate from "../controllers/payment.controller.js"
const router=express.Router()
router.use(auth)
router.post("/create-order",orderCreate)


export default router