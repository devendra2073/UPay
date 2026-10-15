import QRCode from "qrcode";
import crypto from "node:crypto"
import jwt from "jsonwebtoken";
import paymentModel from "../schema/payment.model.js";
import user from "../schema/user.model.js";
export const paymentPage = async (req, res) => {
  try {
    const { tid } = req.params;
    const info = await paymentModel.findOne({ order: tid });
    if (!info) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }
    // Agar user pehle se pay kar chuka hai, to direct redirect page par bhej dein
    if (info.isPaid) {
      return res.redirect(info.redirect || "/pay/thanks");
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
      return res.status(400).json({ status: false, state: "ERROR", message: "Order ID is required" });
    }

    // 1. Order ko find karein (isPaid filter hata kar)
    const dbresp = await paymentModel.findOne({ order: ORDERID });
    if (!dbresp) {
      return res.status(404).json({ status: false, state: "NOT_FOUND", message: "Order not found" });
    }

    // 2. CHECK: Agar order pehle hi verify ho chuka hai (Instant Response for Polling)
    if (dbresp.isPaid) {
      return res.status(200).json({
        status: true,
        state: "SUCCESS",
        message: "Payment already verified",
        utr: dbresp.utr
      });
    }

    // 3. THROTTLING: Gateway ko har 1-2 sec me baar-baar call hone se bachayein
    const now = Date.now();
    const lastChecked = dbresp.lastCheckedAt ? new Date(dbresp.lastCheckedAt).getTime() : 0;
    
    // Agar pichli call ko abhi 3 second nahi hue hain, to Paytm ko skip karein
    if (now - lastChecked < 3000) {
      return res.status(200).json({
        status: false,
        state: "PENDING",
        message: "Awaiting payment confirmation"
      });
    }

    // Last checked timestamp update karein
    dbresp.lastCheckedAt = new Date();
    await dbresp.save();

    const paytmMid = dbresp.paytm?.MID || process.env.PAYTM_MID;
    if (!paytmMid) {
      return res.status(500).json({ status: false, state: "ERROR", message: "Merchant ID configuration missing", errorCode: 2 });
    }

    // 4. Paytm Legacy Status Call
    const verifyUrl = `https://securegw.paytm.in/merchant-status/getTxnStatus?JsonData=${encodeURIComponent(
      JSON.stringify({ MID: paytmMid, ORDERID })
    )}`;

    const response = await fetch(verifyUrl);
    const info = await response.json();

    const isAmountValid = parseFloat(info.TXNAMOUNT) === parseFloat(dbresp.amount);
    const isStatusSuccess = info.STATUS === "TXN_SUCCESS";

    // Agar payment SUCCESS ho gayi hai aur amount match karta hai
    if (isStatusSuccess && isAmountValid) {
      
      // Atomic update - sirf tabhi update hoga agar kisi dusri parallel request ne update na kiya ho
      const updatedOrder = await paymentModel.findOneAndUpdate(
        { order: ORDERID, isPaid: false },
        {
          $set: {
            isPaid: true,
            api_response: JSON.stringify(info),
            utr: info.BANKTXNID || "",
          },
        },
        { new: true }
      );

      // Agar kisi concurrent request ne isko pehle hi update kar diya
      if (!updatedOrder) {
        return res.status(200).json({ status: true, state: "SUCCESS", utr: dbresp.utr });
      }

      // Wallet atomic increment
      await user.findOneAndUpdate(
        { MID: dbresp.MID },
        { $inc: { wallet: dbresp.amount } }
      );

      // Webhook Trigger
      if (dbresp.callback) {
        const payment_info=JSON.stringify({
            ORDERID,
            amount: dbresp.amount,
            UTR: info.BANKTXNID,
            status: "SUCCESS"
          })
        const signature=crypto.createHmac("sha256",api).update(payment_info).digest("hex");
        
        fetch(dbresp.callback, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body:JSON.stringify({
            ORDERID,
            amount: dbresp.amount,
            UTR: info.BANKTXNID,
            status: "SUCCESS",
            signature
          }),
          signal: AbortSignal.timeout(5000)
        }).catch((err) => console.error("Webhook callback failed:", err.message));
      }

      // Cookie Session create karein
      const payinfo = jwt.sign(
        { amount: dbresp.amount, ORDERID },
        process.env.JWT,
        { expiresIn: "1h" }
      );

      res.cookie("payment_session", payinfo, {
        httpOnly: true,
      
      });

      return res.status(200).json({ status: true, state: "SUCCESS", utr: info.BANKTXNID ,payinfo});
    }

    // Agar transaction explicitly Fail ho chuki hai
    if (info.STATUS === "TXN_FAILURE") {
      return res.status(200).json({
        status: false,
        info
        
      
      });
    }

    // Agar abhi tak user ne pay nahi kiya ya pending hai
    return res.status(200).json({
      status: false,
      state: "PENDING",
      message: "Waiting for payment completion"
    });

  } catch (error) {
    console.error("paymentStatus error:", error);
    return res.status(500).json({ status: false, state: "ERROR", message: "Internal server error" });
  }
};

export const thanks = async (req, res) => {
  const cookie = req.cookies?.payment_session;
  if (!cookie) {
    return res.status(401).send("Session expired or invalid");
  }

  try {
    const { amount, ORDERID } = jwt.verify(cookie, process.env.JWT);
    return res.render("thanks", { amount, ORDERID });
  } catch (e) {
    return res.status(400).send("Invalid or expired session token");
  }
};
