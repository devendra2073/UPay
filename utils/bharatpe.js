import * as cheerio from "cheerio";
import crypto from "crypto";
import { gotScraping } from "got-scraping";

const KEY = crypto
  .createHash("sha256")
  .update(process.env.ENCRYPTION_SECRET || "my-super-secret-key")
  .digest();

const MOBILE_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

const MOBILE_BASE_HEADERS = {
  "User-Agent": MOBILE_USER_AGENT,
  "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
  "Sec-CH-UA": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "Sec-CH-UA-Mobile": "?1",
  "Sec-CH-UA-Platform": '"Android"',
};

export default class BharatPe {
  #Token;

  constructor() {
    this.BASE_URL = "https://enterprise.bharatpe.in";
    this.API_BASE_URL = "https://api-merchant.bharatpe.in";
    this.cookies = [];
    this.csrfToken = null;
    this.mobile = null;
    this.uuid = null;
    this.sessionNumber = String(Math.floor(100000 + Math.random() * 900000));
  }

  static async create() {
    try {
      const client = new BharatPe();
      await client.init();
      return client;
    } catch (err) {
      console.error("[BharatPe.create] Error:", err);
      throw err;
    }
  }

  async init() {
    try {
      await this.getSessionAndToken();
    } catch (err) {
      console.error("[BharatPe.init] Error:", err);
      throw err;
    }
  }

  /**
   * Unified Cloudflare-resistant HTTP request helper.
   * 1. Uses got-scraping (Chrome Android TLS/JA3 + HTTP/2 fingerprint).
   * 2. Supports optional BHARATPE_PROXY_URL (residential proxy) or SCRAPER_API_KEY (sticky Indian IP).
   */
  async request(targetUrl, { method = "GET", headers = {}, body = undefined, responseType = "text", sessionNumber = null } = {}) {
    const useScraperApi = Boolean(process.env.SCRAPER_API_KEY);

    const reqHeaders = {
      ...MOBILE_BASE_HEADERS,
      ...headers,
    };

    const options = {
      url: targetUrl,
      method,
      headers: reqHeaders,
      throwHttpErrors: false,
      responseType: responseType === "buffer" ? "buffer" : "text",
      headerGeneratorOptions: {
        devices: ["mobile"],
        operatingSystems: ["android"],
        browsers: [{ name: "chrome", minVersion: 120 }],
        locales: ["en-IN"],
      },
      timeout: { request: 20000 },
    };

    if (body !== undefined) {
      options.body = body;
    }

    if (useScraperApi) {
      const sess = sessionNumber || this.sessionNumber;
      options.proxyUrl = `http://scraperapi.keep_headers=true.country_code=in.device_type=mobile.session_number=${sess}:${process.env.SCRAPER_API_KEY}@proxy-server.scraperapi.com:8001`;
      options.https = { rejectUnauthorized: false };
    } else if (process.env.BHARATPE_PROXY_URL) {
      options.proxyUrl = process.env.BHARATPE_PROXY_URL;
    }

    const res = await gotScraping(options);
    const ok = res.statusCode >= 200 && res.statusCode < 300;
    return {
      ok,
      status: res.statusCode,
      headers: res.headers || {},
      body: res.body,
      rawBody: res.rawBody,
    };
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

    let setCookieHeaders = [];
    if (res?.headers?.getSetCookie) {
      setCookieHeaders = res.headers.getSetCookie();
    } else if (res?.headers?.["set-cookie"]) {
      const raw = res.headers["set-cookie"];
      setCookieHeaders = Array.isArray(raw) ? raw : [raw];
    }

    for (const cookieStr of setCookieHeaders) {
      const [rawName, ...rest] = String(cookieStr).split(";")[0].trim().split("=");
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
    try {
      const res = await this.request(pageUrl, {
        method: "GET",
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
        },
      });

      if (!res.ok) {
        console.error("[BharatPe.getSessionAndToken] HTTP Error:", res.status, String(res.body || "").slice(0, 300));
        throw new Error(`Failed to load page: ${res.status}`);
      }

      this.mergeCookieStrings("", res);

      const html = String(res.body || "");
      const $ = cheerio.load(html);
      this.csrfToken =
        $('meta[name="csrf-token"]').attr("content")?.trim() ||
        $('input[name="_token"]').first().attr("value")?.trim();

      if (!this.csrfToken) {
        console.error("[BharatPe.getSessionAndToken] CSRF token missing. HTML snippet:", html.slice(0, 300));
        throw new Error("CSRF token not found in HTML");
      }
    } catch (err) {
      console.error("[BharatPe.getSessionAndToken] Error:", err);
      throw err;
    }
  }

  async sendOtpRequest(mobileNumber) {
    try {
      if (!mobileNumber) {
        throw new Error("Mobile number is required");
      }

      this.mobile = String(mobileNumber).trim();
      const url = `${this.BASE_URL}/v1/api/user/requestotp`;
      const body = new URLSearchParams({
        mobile: this.mobile,
        _token: this.csrfToken,
      });

      const res = await this.request(url, {
        method: "POST",
        headers: {
          Cookie: this.getcookie(),
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
          Origin: this.BASE_URL,
          Referer: `${this.BASE_URL}/`,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
        },
        body: body.toString(),
      });

      const cookieHeader = this.mergeCookieStrings(this.getcookie(), res);

      if (!res.ok) {
        console.error("[BharatPe.sendOtpRequest] HTTP Error:", res.status, String(res.body || "").slice(0, 300));
        throw new Error(`OTP request failed: ${res.status}`);
      }

      const result = JSON.parse(res.body);
      this.uuid = result.data?.uuid || null;

      if (!this.uuid) {
        console.error("[BharatPe.sendOtpRequest] Missing UUID in response:", result);
        throw new Error(result.message || "UUID not received in OTP response");
      }

      return this.encryptText({
        uuid: this.uuid,
        mobile: this.mobile,
        _token: this.csrfToken,
        cookies: cookieHeader,
        sessionNumber: this.sessionNumber,
      });
    } catch (err) {
      console.error("[BharatPe.sendOtpRequest] Error:", err);
      throw err;
    }
  }

  async loadCaptcha(encryptedData) {
    try {
      const state = this.decryptText(encryptedData);

      const res = await this.request(`${this.BASE_URL}/v1/api/load-captcha?context=otp`, {
        method: "GET",
        responseType: "buffer",
        sessionNumber: state.sessionNumber || this.sessionNumber,
        headers: {
          Cookie: state.cookies || this.getcookie(),
          Accept: "*/*",
          "X-Requested-With": "XMLHttpRequest",
          Referer: `${this.BASE_URL}/`,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
        },
      });

      const updatedCookies = this.mergeCookieStrings(state.cookies, res);

      if (!res.ok) {
        console.error("[BharatPe.loadCaptcha] HTTP Error:", res.status, String(res.rawBody || res.body || "").slice(0, 300));
        throw new Error(`Failed to load captcha: ${res.status}`);
      }

      const contentType = String(res.headers["content-type"] || "image/jpeg")
        .split(";")[0]
        .trim()
        .toLowerCase();
      const buf = Buffer.isBuffer(res.rawBody)
        ? res.rawBody
        : Buffer.isBuffer(res.body)
        ? res.body
        : Buffer.from(res.body || "");

      if (contentType.includes("text/html")) {
        console.error("[BharatPe.loadCaptcha] Received HTML instead of image:", buf.toString("utf8").slice(0, 300));
        throw new Error("Captcha blocked or returned HTML instead of image");
      }

      let captchaDataUri = "";
      if (contentType.includes("application/json")) {
        const json = JSON.parse(buf.toString("utf8"));
        const imgVal = json.captcha || json.image || json.data?.captcha || json.data?.image || "";
        if (!imgVal) {
          console.error("[BharatPe.loadCaptcha] JSON response missing captcha:", json);
          throw new Error("Captcha missing in JSON response");
        }
        captchaDataUri = String(imgVal).startsWith("data:") ? imgVal : `data:image/jpeg;base64,${imgVal}`;
      } else {
        const mime = contentType.startsWith("image/") ? contentType : "image/jpeg";
        captchaDataUri = `data:${mime};base64,${buf.toString("base64")}`;
      }

      const updatedState = {
        ...state,
        cookies: updatedCookies,
      };

      return {
        captcha: captchaDataUri,
        session: this.encryptText(updatedState),
      };
    } catch (err) {
      console.error("[BharatPe.loadCaptcha] Error:", err);
      throw err;
    }
  }

  async verify(otp, captcha, encryptedData) {
    try {
      const state = this.decryptText(encryptedData);

      const payload = new URLSearchParams({
        mobile: state.mobile,
        otp: String(otp).trim(),
        recaptcha_text: String(captcha).trim(),
        uuid: state.uuid,
        _token: state._token,
      });

      const res = await this.request(`${this.BASE_URL}/v1/api/user/verifyotp`, {
        method: "POST",
        sessionNumber: state.sessionNumber || this.sessionNumber,
        headers: {
          Cookie: state.cookies || this.getcookie(),
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
          Origin: this.BASE_URL,
          Referer: `${this.BASE_URL}/`,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
        },
        body: payload.toString(),
      });

      const updatedCookies = this.mergeCookieStrings(state.cookies, res);

      if (!res.ok) {
        console.error("[BharatPe.verify] HTTP Error:", res.status, String(res.body || "").slice(0, 300));
        throw new Error(`OTP verification failed: ${res.status}`);
      }

      const result = JSON.parse(res.body);
      if (!result.success) {
        console.error("[BharatPe.verify] Verification unsuccessful:", result);
      }

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
    } catch (err) {
      console.error("[BharatPe.verify] Error:", err);
      throw err;
    }
  }

  async getMerchantInfo(encryptedData) {
    try {
      const state = this.decryptText(encryptedData);
      const token = state.Token || this.#Token;

      if (!token) {
        throw new Error("Token missing in session state. Verify OTP first.");
      }

      const res = await this.request(`${this.API_BASE_URL}/merchant/v3/getmerchantinfo`, {
        method: "GET",
        sessionNumber: state.sessionNumber || this.sessionNumber,
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          Token: token,
          Origin: this.BASE_URL,
          Referer: `${this.BASE_URL}/`,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
        },
      });

      if (!res.ok) {
        console.error("[BharatPe.getMerchantInfo] HTTP Error:", res.status, String(res.body || "").slice(0, 300));
        throw new Error(`Failed to fetch merchant info: ${res.status}`);
      }

      const json = JSON.parse(res.body);
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
    } catch (err) {
      console.error("[BharatPe.getMerchantInfo] Error:", err);
      throw err;
    }
  }

  encryptText(plainObj) {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);

      const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(plainObj), "utf8"),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
    } catch (err) {
      console.error("[BharatPe.encryptText] Error:", err);
      throw err;
    }
  }

  decryptText(payload) {
    try {
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
    } catch (err) {
      console.error("[BharatPe.decryptText] Error:", err);
      throw err;
    }
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
    try {
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
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${this.BASE_URL}/transactionhistory`,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      };

      if (token) {
        headers.Token = token;
      }

      const res = await this.request(url.toString(), {
        method: "GET",
        headers,
        sessionNumber: state.sessionNumber || this.sessionNumber,
      });
      const updatedCookies = this.mergeCookieStrings(cookieHeader, res);

      if (res.status === 401 || res.status === 403) {
        console.error("[BharatPe.getTransactions] Session expired / blocked HTTP:", res.status, String(res.body || "").slice(0, 300));
        throw new Error(`BharatPe session expired (HTTP ${res.status})`);
      }

      if (!res.ok) {
        console.error("[BharatPe.getTransactions] HTTP Error:", res.status, String(res.body || "").slice(0, 300));
        throw new Error(`Failed to fetch transactions: ${res.status}`);
      }

      const text = String(res.body || "");
      let json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        console.error("[BharatPe.getTransactions] Non-JSON response:", text.slice(0, 300), parseErr);
        throw new Error("BharatPe returned non-JSON response (possible session expiry)");
      }

      if (json.success === false || json.status === false) {
        console.error("[BharatPe.getTransactions] API failure response:", json);
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
    } catch (err) {
      console.error("[BharatPe.getTransactions] Error:", err);
      throw err;
    }
  }

  findPayment(transactions = [], { amount, createdAtMs, expireAtMs }) {
    try {
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
    } catch (err) {
      console.error("[BharatPe.findPayment] Error:", err);
      return null;
    }
  }
}
