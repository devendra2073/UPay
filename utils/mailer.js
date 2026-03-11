import nodemailer from "nodemailer";


const sendMail = async ({ firstname, email, html, subject, text = "This is an HTML mail." }) => {
  try {
    
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.GOOGLE_APP_PASSWORD, 
  },
});
    const message = {
      from: `UPay <${process.env.EMAIL}>`,
      to: `${firstname} <${email}>`,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(message);
    console.log("✅ Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error; // Re-throw so the calling function knows it failed
  }
};

export default sendMail;
