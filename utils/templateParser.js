import fs from "fs/promises"
import path from "path"
const templateParser=async(file,obj)=>{
const p=path.join(import.meta.dirname,`../template/${file}.tpl`)
try{
  
  let data=await fs.readFile(p,'utf-8')
for ( const [key,val] of Object.entries(obj)){
  data=data.replaceAll(`%%${key}`,val)
}
return data
}
catch(error){
  console.log(error)
  return -5
}
}
export default templateParser;