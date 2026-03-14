import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

/**
 * Uploads a buffer to Cloudinary using streams
 * @param {Buffer} buffer - The image buffer to upload
 * @returns {Promise<Object>} Cloudinary upload result
 */
const Upload = async (buffer) => {
  // Fix: added () around resolve, reject
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "upay_images",
        resource_type: "auto",
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );

    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    
    // Buffer ko upload stream mein pipe kar rahe hain
    readableStream.pipe(uploadStream);
  });
};

export default Upload;
