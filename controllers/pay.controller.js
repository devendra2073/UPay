
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import paymentModel from "../schema/payment.model.js";
import user from "../schema/user.model.js";

export const paymentPage = async (req, res) => {
  try {
    const { tid } = req.params;
    const info = await paymentModel.findOne({ order: tid, isPaid: false });

    if (!info) {
      return res.status(404).json({ status: false, message: "Order not found or already paid" });
    }

    const upi = info.paytm?.UPI || process.env.UPI_ID;
    const { amount, company, logo } = info;
    const redirect = info.redirect || "/pay/thanks";

    const commonParams = `pa=${encodeURIComponent(upi)}&tr=${encodeURIComponent(tid)}&am=${amount}&pn=${encodeURIComponent(company)}&tn=${encodeURIComponent("Payment for order " + tid)}`;
    
    const intent = `upi://pay?${commonParams}`;
    const paytmp = `paytmmp://pay?${commonParams}`;
    const phonepe = `phonepe://pay?${commonParams}&mc=5651`;

    // Generate QR locally as Data URL
    const obj = await QRCode.toDataURL(intent, { width: 300, margin: 2 });

    return res.render("index", {
      intent,
      obj,
      amount,
      company,
      tid,
      redirect,
      logo,
      paytmp,
      phonepe,
    });
  } catch (error) {
    console.error("paymentPage error:", error);
    return res.status(500).send("Unable to load payment page");
  }
};

export const paymentStatus = async (req, res) => {
  try {
    const { ORDERID } = req.params;
    if (!ORDERID) {
      return res.status(400).json({ status: false, message: "Order ID is required" });
    }

    const dbresp = await paymentModel.findOne({ order: ORDERID, isPaid: false });
    if (!dbresp) {
      return res.status(404).json({ status: false, message: "Order not found or already processed" });
    }

    const paytmMid = dbresp.paytm?.MID || process.env.PAYTM_MID;
    if (!paytmMid) {
      return res.status(500).json({ status: false, message: "Merchant ID configuration missing", errorCode: 2 });
    }

    const verifyUrl = `https://securegw.paytm.in/merchant-status/getTxnStatus?JsonData=${encodeURIComponent(
      JSON.stringify({ MID: paytmMid, ORDERID })
    )}`;

    const response = await fetch(verifyUrl);
    const info = await response.json();

    const isAmountValid = parseFloat(info.TXNAMOUNT) === parseFloat(dbresp.amount);
    const isStatusSuccess = info.STATUS === "TXN_SUCCESS";

    if (!isStatusSuccess || !isAmountValid) {
      return res.json({ status: false, message: "Transaction incomplete or amount mismatch" });
    }

    // Atomic update to prevent duplicate wallet increments
    const updatedOrder = await paymentModel.findOneAndUpdate(
      { order: ORDERID, isPaid: false },
      {
        $set: {
          isPaid: true,
          api_response: JSON.stringify(info),
          utr: info.BANKTXNID,
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(409).json({ status: false, message: "Order has already been processed" });
    }

    // Atomic wallet balance increment
    await user.findOneAndUpdate(
      { MID: dbresp.MID },
      { $inc: { wallet: dbresp.amount } }
    );

    // Asynchronous webhook dispatch
    if (dbresp.callback) {
      fetch(dbresp.callback, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ORDERID,
          amount: dbresp.amount,
          UTR: info.BANKTXNID,
        }),
      }).catch((err) => console.error("Webhook callback failed:", err.message));
    }

    const payinfo = jwt.sign(
      { amount: dbresp.amount, ORDERID },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("payment_session", payinfo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.json({ status: true, utr: info.BANKTXNID });
  } catch (error) {
    console.error("paymentStatus error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const thanks = async (req, res) => {
  const cookie = req.cookies?.payment_session;
  if (!cookie) {
    return res.status(401).send("Session expired or invalid");
  }

  try {
    const { amount, ORDERID } = jwt.verify(cookie, process.env.JWT_SECRET);
    return res.render("thanks", { amount, ORDERID });
  } catch (e) {
    return res.status(400).send("Invalid or expired session token");
  }
};
