import crypto from "node:crypto";
import QRCode from "qrcode";
import paymentModel from "../schema/payment.model.js";

const createOrder = async (req, res) => {
  try {
    const { MID, company, redirect, pic, paytm, callback, checkoutConfig, securityConfig } = req.user;

    if (securityConfig?.maintenanceMode) {
      return res.json({
        status: false,
        message: "Gateway is currently in Maintenance Mode. Disable it in Security Controls to create orders."
      });
    }

    const paytmdata = {
      MID: paytm?.MID ? paytm.MID : process.env.mid,
      UPI: paytm?.UPI ? paytm.UPI : process.env.upi
    };

    const rawAmount = parseFloat(req.amount || req.body.amount || 0);
    if (!rawAmount || rawAmount <= 0) {
      return res.json({ status: false, message: "Invalid Order Amount" });
    }

    const minAmt = securityConfig?.minOrderAmount || 1;
    const maxAmt = securityConfig?.maxOrderAmount || 100000;
    if (rawAmount < minAmt || rawAmount > maxAmt) {
      return res.json({
        status: false,
        message: `Order amount must be between ₹${minAmt} and ₹${maxAmt}`
      });
    }

    // Convenience Fee Pass-Through calculation if enabled by Admin
    let feeAmount = 0;
    if (checkoutConfig?.passFeeToCustomer && checkoutConfig?.convenienceFeePercent > 0) {
      feeAmount = Number(((rawAmount * checkoutConfig.convenienceFeePercent) / 100).toFixed(2));
    }
    const finalAmount = Number((rawAmount + feeAmount).toFixed(2));

    const mode = req.body.mode || req.mode || "UPI DEPOSIT";
    req.customer = req.customer
      ? req.customer
      : {
          customerName: req.body.customerName || req.user.firstname,
          customerEmail: req.body.customerEmail || req.user.email,
          customerMobile: req.body.customerMobile || req.user.mobile || "Not Given"
        };
    const { customerName, customerMobile, customerEmail } = req.customer;

    const buff = crypto.randomBytes(10);
    const upaytr = buff.toString("hex");
    const logo = pic
      ? pic
      : `https://ui-avatars.com/api/?background=5f259f&color=fff&size=128&name=${encodeURIComponent(company)}`;
    const order = `ORDER${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const pay = new paymentModel({
      order,
      logo,
      baseAmount: rawAmount,
      amount: finalAmount,
      feeAmount,
      MID,
      mode,
      company,
      redirect,
      callback,
      customerName,
      customerPhone: customerMobile,
      customerEmail,
      customerNote: req.body.customerNote || "",
      upaytr,
      paytm: paytmdata,
      selectedTheme: checkoutConfig?.defaultTheme || "phonepe"
    });
    await pay.save();

    const upi = paytmdata.UPI || "merchant@paytm";
    const commonParams = `pa=${encodeURIComponent(upi)}&tr=${encodeURIComponent(order)}&am=${finalAmount}&pn=${encodeURIComponent(company)}&tn=${encodeURIComponent("Payment for order " + order)}`;
    const intent = `upi://pay?${commonParams}`;
    const qrDataUrl = await QRCode.toDataURL(intent, { width: 280, margin: 2 });

    const hostUrl = req.headers.origin || `${req.protocol}://${req.get("host") || "u-pay-seven.vercel.app"}`;

    return res.json({
      status: true,
      order,
      upaytr,
      amount: finalAmount,
      baseAmount: rawAmount,
      feeAmount,
      qrDataUrl,
      intent,
      message: "Order Created Successfully",
      link: `${hostUrl}/pay/${order}`,
      payPath: `/pay/${order}`,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("createOrder error:", error);
    return res.status(500).json({ status: false, message: "Unable to create order" });
  }
};

export default createOrder;
