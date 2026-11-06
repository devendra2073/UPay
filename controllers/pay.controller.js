import QRCode from "qrcode";
import crypto from "node:crypto";
import client from "../utils/clientinfo.js";
import clientModel from "../schema/clientModel.js";
import jwt from "jsonwebtoken";
import parser from "../utils/templateParser.js";
import sendMail from "../utils/mailer.js";
import paymentModel from "../schema/payment.model.js";
import user from "../schema/user.model.js";

const buildUpiQr = async (info) => {
  const upi = info.paytm?.UPI || process.env.UPI_ID || "merchant@paytm";
  const { amount, company, order } = info;
  const commonParams = `pa=${encodeURIComponent(upi)}&tr=${encodeURIComponent(order)}&am=${Number(amount).toFixed(2)}&pn=${encodeURIComponent(company)}&tn=${encodeURIComponent("Payment for order " + order)}`;
  const intent = `upi://pay?${commonParams}`;
  const obj = await QRCode.toDataURL(intent, { width: 320, margin: 2 });
  return { upi, commonParams, intent, obj };
};

export const paymentPage = async (req, res) => {
  try {
    const { tid } = req.params;
    const info = await paymentModel.findOne({ order: tid });
    if (!info) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }
    if (info.isPaid) {
      return res.redirect(info.redirect || "/pay/thanks");
    }

    const merchant = await user.findOne({ MID: info.MID });
    const checkoutConfig = merchant?.checkoutConfig || {
      defaultTheme: "phonepe",
      allowCustomerThemeChange: true,
      allowCustomTheme: true,
      customTheme: {
        primary: "#5f259f",
        secondary: "#7c3aed",
        surface: "#ffffff",
        background: "#f5f0ff",
        text: "#0f172a",
        radius: "24px"
      },
      tagline: "100% Safe & Instant UPI Checkout",
      enableTips: true,
      enableCoupons: true,
      enableSplitBill: true,
      passFeeToCustomer: false,
      convenienceFeePercent: 0
    };

    const { upi, commonParams, intent, obj } = await buildUpiQr(info);
    const { amount, company, logo } = info;
    const baseAmount = info.baseAmount || amount;
    const redirect = info.redirect || "/pay/thanks";

    return res.render("index", {
      intent,
      obj,
      amount,
      baseAmount,
      discountAmount: info.discountAmount || 0,
      couponCode: info.couponCode || "",
      tipAmount: info.tipAmount || 0,
      feeAmount: info.feeAmount || 0,
      company,
      tid,
      upaytr: info.upaytr,
      redirect,
      logo,
      upi,
      customerName: info.customerName || "Guest Customer",
      customerEmail: info.customerEmail || "",
      customerPhone: info.customerPhone || "",
      customerNote: info.customerNote || "",
      selectedTheme: info.selectedTheme || checkoutConfig.defaultTheme || "phonepe",
      checkoutConfig,
      upiParams: commonParams.replace(/&amp;/g, "&")
    });
  } catch (error) {
    console.error("paymentPage error:", error);
    return res.status(500).send("Unable to load payment page");
  }
};

const recalculateOrderTotal = async (info) => {
  const base = Number(info.baseAmount || info.amount || 0);
  const discount = Number(info.discountAmount || 0);
  const tip = Number(info.tipAmount || 0);
  const fee = Number(info.feeAmount || 0);
  const newTotal = Math.max(1, Number((base - discount + tip + fee).toFixed(2)));
  info.amount = newTotal;
  await info.save();
  return buildUpiQr(info);
};

// Customer Feature API 1: Apply Promo / Discount Coupon without reload
export const applyCoupon = async (req, res) => {
  try {
    const { tid } = req.params;
    const { code } = req.body;
    const info = await paymentModel.findOne({ order: tid });
    if (!info || info.isPaid) {
      return res.json({ status: false, message: "Order not eligible for coupon" });
    }
    if (!info.baseAmount) info.baseAmount = info.amount;

    if (!code || !code.trim()) {
      info.discountAmount = 0;
      info.couponCode = "";
      const qr = await recalculateOrderTotal(info);
      return res.json({
        status: true,
        message: "Promo code removed",
        amount: info.amount,
        baseAmount: info.baseAmount,
        discountAmount: 0,
        tipAmount: info.tipAmount || 0,
        feeAmount: info.feeAmount || 0,
        couponCode: "",
        qrDataUrl: qr.obj,
        intent: qr.intent,
        upiParams: qr.commonParams
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const merchant = await user.findOne({ MID: info.MID });
    const coupons = merchant?.coupons || [];

    // Built-in fallback promo codes + Merchant-created promo codes
    const defaultCoupons = [
      { code: "PHONEPE10", type: "PERCENT", value: 10, minOrder: 10, maxDiscount: 250, active: true },
      { code: "UPAY20", type: "PERCENT", value: 20, minOrder: 100, maxDiscount: 500, active: true },
      { code: "WELCOME50", type: "FLAT", value: 50, minOrder: 150, maxDiscount: 50, active: true }
    ];

    const matched =
      coupons.find((c) => c.code === cleanCode && c.active) ||
      defaultCoupons.find((c) => c.code === cleanCode && c.active);

    if (!matched) {
      return res.json({ status: false, message: "Invalid or expired promo code" });
    }

    if (info.baseAmount < (matched.minOrder || 0)) {
      return res.json({
        status: false,
        message: `Minimum order of ₹${matched.minOrder} required for ${cleanCode}`
      });
    }

    let disc = 0;
    if (matched.type === "PERCENT") {
      disc = Number(((info.baseAmount * matched.value) / 100).toFixed(2));
      if (matched.maxDiscount && disc > matched.maxDiscount) disc = matched.maxDiscount;
    } else {
      disc = Number(matched.value);
    }

    if (disc >= info.baseAmount) {
      disc = Math.max(0, Number((info.baseAmount - 1).toFixed(2)));
    }

    info.discountAmount = disc;
    info.couponCode = cleanCode;
    const qr = await recalculateOrderTotal(info);

    return res.json({
      status: true,
      message: `Promo ${cleanCode} applied! You saved ₹${disc.toFixed(2)}`,
      amount: info.amount,
      baseAmount: info.baseAmount,
      discountAmount: info.discountAmount,
      tipAmount: info.tipAmount || 0,
      feeAmount: info.feeAmount || 0,
      couponCode: info.couponCode,
      qrDataUrl: qr.obj,
      intent: qr.intent,
      upiParams: qr.commonParams
    });
  } catch (e) {
    console.error("applyCoupon error:", e);
    return res.status(500).json({ status: false, message: "Could not apply coupon" });
  }
};

// Customer Feature API 2: Add Tip / Gratuity without reload
export const applyTip = async (req, res) => {
  try {
    const { tid } = req.params;
    const tip = Math.max(0, parseFloat(req.body.tip || 0));
    const info = await paymentModel.findOne({ order: tid });
    if (!info || info.isPaid) {
      return res.json({ status: false, message: "Order not found or already paid" });
    }
    if (!info.baseAmount) info.baseAmount = info.amount;
    info.tipAmount = Number(tip.toFixed(2));
    const qr = await recalculateOrderTotal(info);

    return res.json({
      status: true,
      message: tip > 0 ? `Added ₹${tip} tip!` : "Tip removed",
      amount: info.amount,
      baseAmount: info.baseAmount,
      discountAmount: info.discountAmount || 0,
      tipAmount: info.tipAmount,
      feeAmount: info.feeAmount || 0,
      qrDataUrl: qr.obj,
      intent: qr.intent,
      upiParams: qr.commonParams
    });
  } catch (e) {
    return res.status(500).json({ status: false, message: "Failed to update tip" });
  }
};

// Customer Feature API 3: Manual 12-Digit UTR Instant Verification without reload
export const submitManualUtr = async (req, res) => {
  try {
    const { tid } = req.params;
    const { utr } = req.body;
    const cleanUtr = String(utr || "").trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      return res.json({ status: false, message: "Please enter a valid 12-digit numeric UPI UTR / Reference ID" });
    }

    const info = await paymentModel.findOne({ order: tid });
    if (!info) return res.json({ status: false, message: "Order not found" });
    if (info.isPaid) {
      return res.json({ status: true, state: "SUCCESS", utr: info.utr || cleanUtr, message: "Payment already verified!" });
    }

    info.submittedUtr = cleanUtr;
    await info.save();

    return res.json({
      status: true,
      state: "SUBMITTED",
      utr: cleanUtr,
      message: `UTR #${cleanUtr} recorded & queued for instant bank reconciliation.`
    });
  } catch (e) {
    return res.status(500).json({ status: false, message: "Unable to submit UTR" });
  }
};

// Customer Feature API 4: Refresh / Extend Expired Session QR without page reload
export const refreshPaymentQr = async (req, res) => {
  try {
    const { tid } = req.params;
    const info = await paymentModel.findOne({ order: tid });
    if (!info) return res.json({ status: false, message: "Order not found" });
    if (info.isPaid) return res.json({ status: true, isPaid: true, redirect: info.redirect || "/pay/thanks" });

    info.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await info.save();
    const qr = await buildUpiQr(info);

    return res.json({
      status: true,
      message: "Session extended & fresh QR generated!",
      timeInSeconds: 300,
      amount: info.amount,
      qrDataUrl: qr.obj,
      intent: qr.intent,
      upiParams: qr.commonParams
    });
  } catch (e) {
    return res.status(500).json({ status: false, message: "Failed to refresh QR session" });
  }
};

// Customer Feature API 5: Update Payer Details & Payment Note without reload
export const updateCustomerInfo = async (req, res) => {
  try {
    const { tid } = req.params;
    const { customerName, customerEmail, customerPhone, customerNote } = req.body;
    const info = await paymentModel.findOne({ order: tid });
    if (!info) return res.json({ status: false, message: "Order not found" });

    if (customerName) info.customerName = customerName.trim();
    if (customerEmail) info.customerEmail = customerEmail.trim();
    if (customerPhone) info.customerPhone = customerPhone.trim();
    if (typeof customerNote === "string") info.customerNote = customerNote.trim();
    await info.save();

    return res.json({
      status: true,
      message: "Payer details & receipt preferences saved!",
      customerName: info.customerName,
      customerEmail: info.customerEmail,
      customerPhone: info.customerPhone,
      customerNote: info.customerNote
    });
  } catch (e) {
    return res.status(500).json({ status: false, message: "Unable to update customer info" });
  }
};

// Customer Feature API 6: Submit Checkout Experience Rating & Feedback
export const submitPaymentFeedback = async (req, res) => {
  try {
    const { tid } = req.params;
    const { rating, comment } = req.body;
    const info = await paymentModel.findOne({ order: tid });
    if (!info) return res.json({ status: false, message: "Order not found" });

    info.feedback = {
      rating: Math.min(5, Math.max(1, Number(rating || 5))),
      comment: String(comment || "").trim(),
      submittedAt: new Date()
    };
    await info.save();
    return res.json({ status: true, message: "Thank you for rating your UPay experience!" });
  } catch (e) {
    return res.status(500).json({ status: false, message: "Unable to save feedback" });
  }
};

// Customer Feature API 7: Raise Support / Dispute Ticket on Order
export const raisePaymentDispute = async (req, res) => {
  try {
    const { tid } = req.params;
    const { reason, utr } = req.body;
    if (!reason || !reason.trim()) {
      return res.json({ status: false, message: "Please describe your issue" });
    }
    const info = await paymentModel.findOne({ order: tid });
    if (!info) return res.json({ status: false, message: "Order not found" });

    info.dispute = {
      raised: true,
      reason: reason.trim() + (utr ? ` (UTR: ${utr})` : ""),
      status: "OPEN",
      createdAt: new Date()
    };
    if (utr) info.submittedUtr = String(utr).trim();
    await info.save();

    return res.json({
      status: true,
      message: "Support ticket logged with Merchant Dispute Desk. Ticket ID: #DSP-" + info.upaytr.slice(0, 6).toUpperCase()
    });
  } catch (e) {
    return res.status(500).json({ status: false, message: "Unable to submit ticket" });
  }
};

// Customer Feature API 8: Save Selected Theme Preference
export const setPaymentTheme = async (req, res) => {
  try {
    const { tid } = req.params;
    const { theme } = req.body;
    await paymentModel.updateOne({ order: tid }, { $set: { selectedTheme: theme || "phonepe" } });
    return res.json({ status: true, theme });
  } catch (e) {
    return res.json({ status: false });
  }
};

export const paymentStatus = async (req, res) => {
  try {
    const { ORDERID } = req.params;
    if (!ORDERID) {
      return res.status(400).json({ status: false, state: "ERROR", message: "Order ID is required" });
    }

    const dbresp = await paymentModel.findOne({ order: ORDERID });
    if (!dbresp) {
      return res.status(404).json({ status: false, state: "NOT_FOUND", message: "Order not found" });
    }

    if (dbresp.isPaid) {
      const payinfo = jwt.sign(
        { amount: dbresp.amount, ORDERID },
        process.env.JWT || "upay_secret_key",
        { expiresIn: "1h" }
      );
      res.cookie("payment_session", payinfo, { httpOnly: true });
      return res.status(200).json({
        status: true,
        state: "SUCCESS",
        message: "Payment already verified",
        utr: dbresp.utr,
        amount: dbresp.amount
      });
    }

    const now = Date.now();
    const lastChecked = dbresp.lastCheckedAt ? new Date(dbresp.lastCheckedAt).getTime() : 0;

    if (now - lastChecked < 3000) {
      return res.status(200).json({
        status: false,
        state: "PENDING",
        message: "Awaiting payment confirmation"
      });
    }

    dbresp.lastCheckedAt = new Date();
    await dbresp.save();

    const paytmMid = dbresp.paytm?.MID || process.env.PAYTM_MID;
    if (!paytmMid) {
      return res.status(200).json({
        status: false,
        state: "PENDING",
        message: "Waiting for payment confirmation"
      });
    }

    const verifyUrl = `https://securegw.paytm.in/merchant-status/getTxnStatus?JsonData=${encodeURIComponent(
      JSON.stringify({ MID: paytmMid, ORDERID })
    )}`;

    const response = await fetch(verifyUrl);
    const info = await response.json();

    const isAmountValid = parseFloat(info.TXNAMOUNT) === parseFloat(dbresp.amount);
    const isStatusSuccess = info.STATUS === "TXN_SUCCESS";

    if (isStatusSuccess && isAmountValid) {
      const updatedOrder = await paymentModel.findOneAndUpdate(
        { order: ORDERID, isPaid: false },
        {
          $set: {
            isPaid: true,
            status: "PAID",
            api_response: JSON.stringify(info),
            utr: info.BANKTXNID || "",
            paymentDate: Date.now()
          }
        },
        { new: true }
      );

      if (!updatedOrder) {
        return res.status(200).json({ status: true, state: "SUCCESS", utr: dbresp.utr });
      }

      await user.findOneAndUpdate(
        { MID: dbresp.MID },
        { $inc: { wallet: dbresp.amount } }
      );
      const user_for_api = await user.findOne({ MID: dbresp.MID });
      const api = user_for_api?.api || "secret";

      if (dbresp.callback) {
        const payment_info = JSON.stringify({
          ORDERID,
          amount: dbresp.amount,
          UTR: info.BANKTXNID,
          status: "SUCCESS"
        });
        const signature = crypto.createHmac("sha256", api).update(payment_info).digest("hex");
        fetch(dbresp.callback, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ORDERID,
            amount: dbresp.amount,
            UTR: info.BANKTXNID,
            status: "SUCCESS",
            signature
          }),
          signal: AbortSignal.timeout(5000)
        }).catch((err) => console.error("Webhook callback failed:", err.message));
      }

      const payinfo = jwt.sign(
        { amount: dbresp.amount, ORDERID },
        process.env.JWT || "upay_secret_key",
        { expiresIn: "1h" }
      );

      res.cookie("payment_session", payinfo, { httpOnly: true });

      try {
        const merchant_name = updatedOrder.company;
        const customer_name = updatedOrder.customerName;
        const mobile_number = updatedOrder.customerPhone;
        const email = updatedOrder.customerEmail;
        const order_id = updatedOrder.order;
        const transaction_id = updatedOrder.upaytr;
        const amount = updatedOrder.amount;
        const dt = updatedOrder.paymentDate;
        const payment_date = dt.toLocaleString();
        const html = await parser("purchase", {
          customer_name,
          mobile_number,
          merchant_name,
          email,
          amount,
          payment_date,
          transaction_id,
          order_id
        });
        if (email && email.includes("@")) {
          await sendMail({ email, firstname: customer_name, subject: "Payment confirmation for " + merchant_name, html });
        }
        const cl = await client(req);
        const clientData = new clientModel({
          upaytr: updatedOrder.upaytr,
          ...cl
        });
        await clientData.save();
      } catch (auxErr) {
        console.warn("Auxiliary post-payment hook warning:", auxErr.message);
      }

      return res.status(200).json({ status: true, state: "SUCCESS", utr: info.BANKTXNID });
    }

    if (info.STATUS === "TXN_FAILURE") {
      return res.status(200).json({
        status: false,
        state: "FAILED",
        message: info.RESPMSG || "Transaction declined by bank"
      });
    }

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
    return res.render("thanks", { amount: req.query.amount || 1499, ORDERID: req.query.order || "ORDER_VERIFIED" });
  }

  try {
    const { amount, ORDERID } = jwt.verify(cookie, process.env.JWT || "upay_secret_key");
    return res.render("thanks", { amount, ORDERID });
  } catch (e) {
    return res.render("thanks", { amount: 1499, ORDERID: "ORDER_VERIFIED" });
  }
};
