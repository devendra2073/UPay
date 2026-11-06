/**
 * UPay Minimal Money Loader & Global API Fetch Interceptor
 * Provides a sleek PhonePe-inspired floating Rupee coin loader for API calls without page reloads.
 */
(function () {
  const style = document.createElement("style");
  style.textContent = `
    #upay-money-loader {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(15, 10, 30, 0.28);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #upay-money-loader.active {
      opacity: 1;
      pointer-events: auto;
    }
    .upay-loader-pill {
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(95, 37, 159, 0.16);
      box-shadow: 0 20px 45px -10px rgba(95, 37, 159, 0.28), 0 4px 12px rgba(0, 0, 0, 0.06);
      border-radius: 9999px;
      padding: 10px 20px 10px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      transform: translateY(8px) scale(0.96);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #upay-money-loader.active .upay-loader-pill {
      transform: translateY(0) scale(1);
    }
    .upay-coin-wrap {
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .upay-coin-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid transparent;
      border-top-color: #5f259f;
      border-right-color: #f59e0b;
      animation: upayRingSpin 0.85s linear infinite;
    }
    .upay-coin-pulse {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(95,37,159,0.22) 0%, transparent 70%);
      animation: upayPulse 1.4s ease-in-out infinite;
    }
    .upay-coin-core {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: linear-gradient(135deg, #5f259f 0%, #7c3aed 60%, #f59e0b 100%);
      color: #ffffff;
      font-weight: 800;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 1px 2px rgba(255,255,255,0.45), 0 2px 6px rgba(95, 37, 159, 0.35);
      animation: upayCoinFlip 1.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }
    .upay-loader-text {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #1e1b4b;
      letter-spacing: -0.01em;
      display: flex;
      flex-direction: column;
    }
    .upay-loader-sub {
      font-size: 10px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    @keyframes upayRingSpin {
      to { transform: rotate(360deg); }
    }
    @keyframes upayCoinFlip {
      0%, 100% { transform: rotateY(0deg) scale(1); }
      50% { transform: rotateY(180deg) scale(1.08); }
    }
    @keyframes upayPulse {
      0%, 100% { transform: scale(0.92); opacity: 0.5; }
      50% { transform: scale(1.18); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  let loaderEl = null;
  let labelEl = null;
  let activeRequests = 0;
  let hideTimeout = null;

  function ensureDOM() {
    if (loaderEl) return;
    loaderEl = document.createElement("div");
    loaderEl.id = "upay-money-loader";
    loaderEl.setAttribute("role", "status");
    loaderEl.setAttribute("aria-live", "polite");
    loaderEl.innerHTML = `
      <div class="upay-loader-pill">
        <div class="upay-coin-wrap">
          <div class="upay-coin-pulse"></div>
          <div class="upay-coin-ring"></div>
          <div class="upay-coin-core">&#8377;</div>
        </div>
        <div class="upay-loader-text">
          <span id="upay-loader-label">Processing Request</span>
          <span class="upay-loader-sub">PhonePe UPI Rail • 256-Bit</span>
        </div>
      </div>
    `;
    document.body.appendChild(loaderEl);
    labelEl = loaderEl.querySelector("#upay-loader-label");
  }

  window.UPayLoader = {
    show(message = "Syncing Money Rail...") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.show(message), { once: true });
        return;
      }
      ensureDOM();
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      activeRequests++;
      if (labelEl && message) labelEl.textContent = message;
      loaderEl.classList.add("active");
    },
    hide(force = false) {
      if (force) {
        activeRequests = 0;
      } else {
        activeRequests = Math.max(0, activeRequests - 1);
      }
      if (activeRequests === 0 && loaderEl) {
        hideTimeout = setTimeout(() => {
          if (activeRequests === 0 && loaderEl) {
            loaderEl.classList.remove("active");
          }
        }, 180);
      }
    }
  };

  // Intercept fetch calls automatically (except silent background status polling)
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (input, init = {}) {
    const url = typeof input === "string" ? input : (input?.url || "");
    const isSilentPoll =
      (url.includes("/pay/status/") && (!init.method || init.method === "GET") && !init.headers?.["X-Show-Loader"]) ||
      init.silent === true;

    let customLabel = init.loaderText || "Processing Transaction...";
    if (url.includes("coupon")) customLabel = "Applying Promo Savings...";
    else if (url.includes("tip")) customLabel = "Updating Gratitude Tip...";
    else if (url.includes("verify-utr")) customLabel = "Verifying Bank UTR...";
    else if (url.includes("refresh-qr")) customLabel = "Generating Fresh QR...";
    else if (url.includes("withdraw")) customLabel = "Initiating Bank Payout...";
    else if (url.includes("create-order") || url.includes("payment-links")) customLabel = "Minting UPI Order...";
    else if (url.includes("theme")) customLabel = "Saving Theme Studio...";
    else if (url.includes("balance")) customLabel = "Syncing Wallet Liquidity...";

    if (!isSilentPoll) {
      window.UPayLoader.show(customLabel);
    }
    try {
      const response = await originalFetch(input, init);
      return response;
    } finally {
      if (!isSilentPoll) {
        window.UPayLoader.hide();
      }
    }
  };
})();
