import fs from "fs/promises"
import path from "path"
const logger=async(req,str)=>{
  const data=`${req.method} ${req.path} ${req.ip} ${str} ${new Date().toLocaleString()}`
  const file=path.join(import.meta.dirname,"../public/error.log")
  await fs.appendFile(file,data,cb=>{
    if(cb) console.log(cb)
  })
}
export default logger;