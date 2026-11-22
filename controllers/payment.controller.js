import crypto from "node:crypto";
import QRCode from "qrcode";
import paymentModel from "../schema/payment.model.js";
import {
  allocateUniqueBharatPeAmount,
  BHARATPE_QR_TTL_MS
} from "../utils/bharatpeOrderHelper.js";

const createOrder = async (req, res) => {
  try {
    const {
      MID,
      company,
      redirect,
      pic,
      paytm,
      bharatpe,
      activeProvider,
      callback,
      checkoutConfig,
      securityConfig
    } = req.user;

    if (securityConfig?.maintenanceMode) {
      return res.json({
        status: false,
        message: "Gateway is currently in Maintenance Mode. Disable it in Security Controls to create orders."
      });
    }

    const requestedProvider = String(req.body.provider || activeProvider || "PAYTM").toUpperCase();
    const provider = requestedProvider === "BHARATPE" ? "BHARATPE" : "PAYTM";

    const paytmdata = {
      MID: paytm?.MID ? paytm.MID : process.env.mid,
      UPI: paytm?.UPI ? paytm.UPI : process.env.upi
    };

    const bharatpeData = {
      merchantId: bharatpe?.merchantId || "",
      UPI: bharatpe?.UPI || ""
    };

    if (provider === "BHARATPE") {
      if (!bharatpe?.isConnected || !bharatpe?.session || !bharatpeData.merchantId || !bharatpeData.UPI) {
        return res.json({
          status: false,
          message: "BharatPe Business is not connected or missing Merchant ID / UPI ID. Please configure it in Dashboard."
        });
      }
    }

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

    let feeAmount = 0;
    if (checkoutConfig?.passFeeToCustomer && checkoutConfig?.convenienceFeePercent > 0) {
      feeAmount = Number(((rawAmount * checkoutConfig.convenienceFeePercent) / 100).toFixed(2));
    }
    const computedAmount = Number((rawAmount + feeAmount).toFixed(2));

    let finalAmount = computedAmount;
    let uniqueAmountOffset = 0;
    const expiresAt = new Date(Date.now() + BHARATPE_QR_TTL_MS);

    if (provider === "BHARATPE") {
      const allocated = await allocateUniqueBharatPeAmount(MID, computedAmount);
      finalAmount = allocated.amount;
      uniqueAmountOffset = allocated.offset;
    }

    const mode = req.body.mode || req.mode || (provider === "BHARATPE" ? "BHARATPE UPI" : "UPI DEPOSIT");

    // Redirect logic:
    // - If created via external API (req.mode === "PORTAL"), redirect user to merchant's configured redirect URL.
    // - If created manually by Admin in Dashboard / Payment Link, ALWAYS redirect to "/pay/thanks".
    const isApiOrder = req.mode === "PORTAL";
    const resolvedRedirect = isApiOrder
      ? (req.body.redirect || redirect || "/pay/thanks")
      : "/pay/thanks";

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
      uniqueAmountOffset,
      feeAmount,
      MID,
      mode,
      provider,
      company,
      redirect: resolvedRedirect,
      callback: isApiOrder ? callback : (req.body.callback || callback),
      customerName,
      customerPhone: customerMobile,
      customerEmail,
      customerNote: req.body.customerNote || "",
      upaytr,
      expiresAt,
      isDisabled: false,
      paytm: provider === "PAYTM" ? paytmdata : undefined,
      bharatpe: provider === "BHARATPE" ? bharatpeData : undefined,
      selectedTheme: checkoutConfig?.defaultTheme || "upay2"
    });
    await pay.save();

    const upi = provider === "BHARATPE" ? bharatpeData.UPI : (paytmdata.UPI || "merchant@paytm");
    const commonParams = `pa=${encodeURIComponent(upi)}&tr=${encodeURIComponent(order)}&am=${finalAmount.toFixed(2)}&pn=${encodeURIComponent(company)}&tn=${encodeURIComponent("Payment for order " + order)}`;
    const intent = `upi://pay?${commonParams}`;
    const qrDataUrl = await QRCode.toDataURL(intent, { width: 280, margin: 2 });

    const hostUrl = "https://u-pay-seven.vercel.app";

    return res.json({
      status: true,
      provider,
      order,
      upaytr,
      amount: finalAmount,
      baseAmount: rawAmount,
      uniqueAmountOffset,
      feeAmount,
      expiresAt,
      redirect: resolvedRedirect,
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
