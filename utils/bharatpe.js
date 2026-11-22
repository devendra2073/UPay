import * as cheerio from "cheerio";
import crypto from "crypto";

const KEY = crypto
  .createHash("sha256")
  .update(process.env.ENCRYPTION_SECRET || "my-super-secret-key")
  .digest();

const USER_AGENT =
  "Mozilla/5.0 (Android 15; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0";

export default class BharatPe {
  #Token;

  constructor() {
    this.BASE_URL = "https://enterprise.bharatpe.in";
    this.API_BASE_URL = "https://api-merchant.bharatpe.in";
    this.cookies = [];
    this.csrfToken = null;
    this.mobile = null;
    this.uuid = null;
  }

  static async create() {
    const client = new BharatPe();
    await client.init();
    return client;
  }

  async init() {
    await this.getSessionAndToken();
  }

  mergeCookieStrings(existingCookieHeader = "", res) {
    const map = new Map();

    if (existingCookieHeader) {
      for (const part of existingCookieHeader.split(";")) {
        const [rawName, ...rest] = part.trim().split("=");
        const name = rawName?.trim();
        if (name) {
          map.set(name, rest.join("=").trim());
        }
      }
    }

    const setCookieHeaders = res?.headers?.getSetCookie?.() ?? [];
    for (const cookieStr of setCookieHeaders) {
      const [rawName, ...rest] = cookieStr.split(";")[0].trim().split("=");
      const name = rawName?.trim();
      if (name) {
        map.set(name, rest.join("=").trim());
      }
    }

    const mergedList = Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    this.cookies = mergedList;
    return mergedList.map((c) => `${c.name}=${c.value}`).join("; ");
  }

  getcookie() {
    if (!Array.isArray(this.cookies) || this.cookies.length === 0) {
      return "";
    }
    return this.cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  }

  maskAccountNumber(accountNumber = "") {
    const str = String(accountNumber || "").trim();
    if (!str) return "";
    if (str.length <= 4) return str;
    return `${"X".repeat(str.length - 4)}${str.slice(-4)}`;
  }

  async getSessionAndToken() {
    const pageUrl = `${this.BASE_URL}/`;

    const res = await fetch(pageUrl, {
      method: "GET",
      headers: {
  "User-Agent": USER_AGENT,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
      },
    });
    

    if (!res.ok) {
      console.log(res)
      console.log(await res.text())
      throw new Error(`Failed to load page: ${res.status}`);
    }

    this.mergeCookieStrings("", res);

    const html = await res.text();
    const $ = cheerio.load(html);
    this.csrfToken =
      $('meta[name="csrf-token"]').attr("content")?.trim() ||
      $('input[name="_token"]').first().attr("value")?.trim();

    if (!this.csrfToken) {
      throw new Error("CSRF token not found in HTML");
    }
  }

  async sendOtpRequest(mobileNumber) {
    if (!mobileNumber) {
      throw new Error("Mobile number is required");
    }

    this.mobile = String(mobileNumber).trim();
    const url = `${this.BASE_URL}/v1/api/user/requestotp`;
    const body = new URLSearchParams({
      mobile: this.mobile,
      _token: this.csrfToken,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Cookie: this.getcookie(),
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Origin: this.BASE_URL,
        Referer: `${this.BASE_URL}/`,
      },
      body: body.toString(),
    });

    const cookieHeader = this.mergeCookieStrings(this.getcookie(), res);

    if (!res.ok) {
      throw new Error(`OTP request failed: ${res.status}`);
    }

    const result = await res.json();
    this.uuid = result.data?.uuid || null;

    if (!this.uuid) {
      throw new Error(result.message || "UUID not received in OTP response");
    }

    return this.encryptText({
      uuid: this.uuid,
      mobile: this.mobile,
      _token: this.csrfToken,
      cookies: cookieHeader,
    });
  }

  async loadCaptcha(encryptedData) {
    const state = this.decryptText(encryptedData);

    const res = await fetch(`${this.BASE_URL}/v1/api/load-captcha?context=otp`, {
      method: "GET",
      headers: {
        Cookie: state.cookies || this.getcookie(),
        "User-Agent": USER_AGENT,
        Accept: "*/*",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${this.BASE_URL}/`,
      },
    });

    const updatedCookies = this.mergeCookieStrings(state.cookies, res);

    if (!res.ok) {
      throw new Error(`Failed to load captcha: ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const updatedState = {
      ...state,
      cookies: updatedCookies,
    };

    return {
      captcha: `data:image/jpeg;base64,${base64}`,
      session: this.encryptText(updatedState),
    };
  }

  async verify(otp, captcha, encryptedData) {
    const state = this.decryptText(encryptedData);

    const payload = new URLSearchParams({
      mobile: state.mobile,
      otp: String(otp).trim(),
      recaptcha_text: String(captcha).trim(),
      uuid: state.uuid,
      _token: state._token,
    });

    const res = await fetch(`${this.BASE_URL}/v1/api/user/verifyotp`, {
      method: "POST",
      headers: {
        Cookie: state.cookies || this.getcookie(),
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "*/*",
        "X-Requested-With": "XMLHttpRequest",
        Origin: this.BASE_URL,
        Referer: `${this.BASE_URL}/`,
      },
      body: payload.toString(),
    });

    const updatedCookies = this.mergeCookieStrings(state.cookies, res);

    if (!res.ok) {
      throw new Error(`OTP verification failed: ${res.status}`);
    }

    const result = await res.json();
    const accessToken =
      result.data?.accessToken || result.data?.token || result.token || null;
    this.#Token = accessToken;

    const updatedState = {
      ...state,
      cookies: updatedCookies,
      Token: accessToken,
    };

    return {
      status: Boolean(result.success),
      data: this.encryptText(updatedState),
      raw: result,
    };
  }

  async getMerchantInfo(encryptedData) {
    const state = this.decryptText(encryptedData);
    const token = state.Token || this.#Token;

    if (!token) {
      throw new Error("Token missing in session state. Verify OTP first.");
    }

    const res = await fetch(`${this.API_BASE_URL}/merchant/v3/getmerchantinfo`, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.5",
        Token: token,
        Origin: this.BASE_URL,
        Referer: `${this.BASE_URL}/`,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch merchant info: ${res.status}`);
    }

    const json = await res.json();
    const info = json?.data || {};
    const bank = info?.bankInfo || {};
    const rawAccount = info.accountNumber || bank.accountNumber || "";

    return {
      status: Boolean(json?.status ?? true),
      merchant: {
        merchantId: info.merchantId ? String(info.merchantId) : "",
        mid: info.mid || "",
        mobile: info.mobile || "",
        upiId: info.upiid || "",
        beneficiaryName: info.beneficiaryName || bank.beneficiaryName || "",
        businessName: info.businessName || "",
        maskedAccountNumber: this.maskAccountNumber(rawAccount),
        ifscLogo: info.ifscLogo || bank.ifscLogo || "",
      },
    };
  }

  encryptText(plainObj) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);

    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(plainObj), "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
  }

  decryptText(payload) {
    if (!payload || typeof payload !== "string") {
      throw new Error("Encrypted session payload is missing or invalid");
    }

    const parts = payload.split(":");
    if (parts.length !== 3) {
      throw new Error("Malformed encrypted payload format");
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8"));
  }

  getToken() {
    return this.#Token;
  }

  formatDateRangeIST(date = new Date()) {
    const istTime = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    const yyyy = istTime.getUTCFullYear();
    const mm = String(istTime.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(istTime.getUTCDate()).padStart(2, "0");
    const day = `${yyyy}-${mm}-${dd}`;
    return {
      start_date: `${day} 00:00:00`,
      end_date: `${day} 23:59:59`,
    };
  }

  async getTransactions(encryptedData, { merchantId, date = new Date() } = {}) {
    const state = encryptedData ? this.decryptText(encryptedData) : {};
    const cookieHeader = state.cookies || this.getcookie();
    const token = state.Token || this.#Token;

    if (!merchantId) {
      throw new Error("merchantId is required to fetch transaction history");
    }

    const { start_date, end_date } = this.formatDateRangeIST(date);
    const url = new URL(`${this.BASE_URL}/v1/api/allHistory`);
    url.searchParams.set("type", "txns");
    url.searchParams.set("merchant_id", String(merchantId));
    url.searchParams.set("start_date", start_date);
    url.searchParams.set("end_date", end_date);

    const headers = {
      Cookie: cookieHeader,
      "User-Agent": USER_AGENT,
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${this.BASE_URL}/transactionhistory`,
    };

    if (token) {
      headers.Token = token;
    }

    const res = await fetch(url.toString(), { method: "GET", headers });
    const updatedCookies = this.mergeCookieStrings(cookieHeader, res);

    if (res.status === 401 || res.status === 403) {
      throw new Error(`BharatPe session expired (HTTP ${res.status})`);
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch transactions: ${res.status}`);
    }

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("BharatPe returned non-JSON response (possible session expiry)");
    }

    if (json.success === false || json.status === false) {
      throw new Error(json.message || "BharatPe transaction API returned failure");
    }

    const data = json.data || {};
    const transactions =
      Array.isArray(data.transactions) ? data.transactions :
      Array.isArray(data.txns) ? data.txns :
      Array.isArray(data.records) ? data.records :
      Array.isArray(data.list) ? data.list :
      [];

    const updatedSession = encryptedData
      ? this.encryptText({ ...state, cookies: updatedCookies })
      : null;

    return {
      transactions,
      session: updatedSession,
      raw: json,
    };
  }

  findPayment(transactions = [], { amount, createdAtMs, expireAtMs }) {
    const targetAmount = Number(amount);

    for (const tx of transactions) {
      const txStatus = String(tx.status ?? tx.txnStatus ?? "").toUpperCase();
      if (txStatus && ["FAILED", "FAILURE", "CANCELLED", "EXPIRED", "PENDING"].includes(txStatus)) {
        continue;
      }

      const txAmount = Number(tx.amount ?? tx.txnAmount ?? 0);
      const rawTs =
        tx.paymentTimestamp ?? tx.txnTimestamp ?? tx.timestamp ?? tx.created_at ?? 0;
      const txMs = typeof rawTs === "number" ? rawTs : Date.parse(rawTs);

      if (
        Math.abs(txAmount - targetAmount) < 0.001 &&
        Number.isFinite(txMs) &&
        txMs >= createdAtMs &&
        txMs <= expireAtMs
      ) {
        return tx;
      }
    }

    return null;
  }
}
