import express from "express"
import {paymentPage,paymentStatus ,thanks}from "../controllers/pay.controller.js"
const router=express.Router()
router.get("/thanks",thanks)
router.get("/:tid",paymentPage)
router.get("/status/:ORDERID",paymentStatus)



export default router