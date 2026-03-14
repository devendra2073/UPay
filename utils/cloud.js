import cloudinary from "cloudinary"
import {Readable} from "stream"

const Upload=async(buffer)=>{
  return new Promise(resolve,reject)=>{
    const uploadStream=cloudinary.uploader.upload_stream({
      folder:"upay_images",
      resource_type:"auto"
    },
    (err,result)=>{
      if (err) return reject(err)
      resolve(result)
    }
      )
      const readableStream=new Readable()
      readableStream.push(buffer)
      readableStream.push(null)
      readableStream.pipe(uploadStream)
  }
}
export default Upload;