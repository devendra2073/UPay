import fs from "fs/promises"

import path from 'path'
const bank=async()=>{
  try {
const file=path.join(import.meta.dirname,"bank.json")
const data=await fs.readFile(file,"utf-8")
return JSON.parse(data)
  } catch (e) {
    console.log(e)
    return -1
  }
}
export default bank;
