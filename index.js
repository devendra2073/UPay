import express from "express";
import dot from "dotenv"
import fs from "fs"
import mongoose from "mongoose"
import path from "path"
import apirouter from "./routes/api.routes.js"
import userRouter from "./routes/user.routes.js"
import cookieParser from "cookie-parser"
import payrouter from "./routes/pay.routes.js"
dot.config()
const PORT=process.env.PORT || 3000
const URI=process.env.MONGO_URI || null
if (URI){
  await mongoose.connect(URI)
}
const app=express()
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.join(import.meta.dirname,"public")))
app.set("view engine","ejs")
app.use("/api",apirouter)
app.use("/pay",payrouter)
app.use("/user",userRouter)
app.get("/*path",async(req,res)=>{
  const info=`${req.method} ${req.path} : ${req.ip} : ${new Date().toLocaleString()}\n`
  await fs.appendFile("system.log",info,e=>{
    if(e) console.log("Error in log")
    else{
      console.log("Log written")
    }
  })
  res.render("403",{ip:req.ip})
})


app.listen(PORT,"0.0.0.0",e=>{
  console.log(`Server runing at ${PORT}`)
})