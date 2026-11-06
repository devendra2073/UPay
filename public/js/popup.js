class UPayDeposit {
  constructor() {
    this.overlay = null;
  }

  open() {
    this.overlay = document.createElement("div");
    this.overlay.className =
      "fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#180828]/60 backdrop-blur-md p-4 transition-all duration-300";

    this.overlay.innerHTML = `
      <div class="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-purple-100 transform transition-all">
        <div class="bg-gradient-to-r from-[#5f259f] via-[#6d28d9] to-[#4c1d95] p-6 text-white relative">
          <button id="close-upay" class="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] uppercase tracking-widest font-bold mb-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            UPay 2.0 Instant Collect (Redirects to /pay/thanks)
          </div>
          <h2 class="text-xl font-extrabold tracking-tight">Create Collect Order / Add Liquidity</h2>
        </div>

        <div id="upay-form-stage" class="p-6 space-y-5">
          <div class="space-y-1.5">
            <label class="text-slate-500 text-xs font-bold uppercase tracking-wider ml-1">Enter Amount (INR)</label>
            <div class="relative flex items-center">
              <span class="absolute left-4 text-2xl font-extrabold text-[#5f259f]">&#8377;</span>
              <input type="number" id="upay-amount" placeholder="500" value="500"
                class="w-full bg-purple-50/50 border-2 border-purple-100 focus:border-[#5f259f] focus:bg-white rounded-2xl py-4 pl-11 pr-5 text-2xl font-extrabold text-slate-900 outline-none transition-all">
            </div>
          </div>

          <div class="grid grid-cols-4 gap-2">
            ${[100, 500, 1000, 2500]
              .map(
                (amt) => `
              <button type="button" onclick="document.getElementById('upay-amount').value = ${amt}"
                class="py-2.5 rounded-xl border border-purple-100 bg-purple-50/40 text-[#5f259f] text-xs font-extrabold hover:bg-[#5f259f] hover:text-white transition-all cursor-pointer">
                +&#8377;${amt}
              </button>
            `
              )
              .join("")}
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" id="upay-cust-name" placeholder="Customer Name (Optional)"
              class="w-full bg-slate-50 border border-slate-200 focus:border-[#5f259f] rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none">
            <input type="text" id="upay-cust-note" placeholder="Order Note / Purpose"
              class="w-full bg-slate-50 border border-slate-200 focus:border-[#5f259f] rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none">
          </div>

          <button id="upay-confirm" type="button" class="w-full bg-gradient-to-r from-[#5f259f] to-[#7c3aed] text-white py-4 rounded-2xl font-extrabold text-sm shadow-lg shadow-purple-200 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer">
            <span>Generate UPay 2.0 Checkout</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <div id="upay-qr-stage" class="hidden p-6 text-center space-y-4">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            UPay 2.0 Order Ready — Redirects to /pay/thanks
          </div>
          <div class="p-3 bg-white border-2 border-purple-100 rounded-2xl inline-block shadow-md">
            <img id="upay-modal-qr" src="" alt="UPI QR" class="w-44 h-44 mx-auto object-contain">
          </div>
          <div>
            <p id="upay-modal-order" class="text-xs font-mono font-bold text-slate-500"></p>
            <p id="upay-modal-amt" class="text-2xl font-black text-slate-900 mt-0.5"></p>
          </div>
          <div class="grid grid-cols-2 gap-2.5 pt-2">
            <button type="button" id="upay-copy-link" class="py-3 px-4 rounded-xl bg-purple-50 text-[#5f259f] font-bold text-xs hover:bg-purple-100 transition cursor-pointer">
              Copy Checkout Link
            </button>
            <a id="upay-open-checkout" href="#" target="_blank" class="py-3 px-4 rounded-xl bg-[#5f259f] text-white font-bold text-xs hover:bg-[#4c1d95] transition flex items-center justify-center gap-1">
              <span>Open Checkout</span>
              <span>&rarr;</span>
            </a>
          </div>
          <button type="button" id="upay-sim-btn" class="w-full py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-700 font-bold text-xs hover:bg-emerald-100 transition cursor-pointer">
            Simulate Instant Payment (Sandbox Test)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this._initEvents();
  }

  _initEvents() {
    const closeBtn = document.getElementById("close-upay");
    const confirmBtn = document.getElementById("upay-confirm");
    const input = document.getElementById("upay-amount");

    closeBtn.onclick = () => this.overlay.remove();
    this.overlay.onclick = (e) => {
      if (e.target === this.overlay) this.overlay.remove();
    };

    confirmBtn.onclick = async () => {
      const val = parseFloat(input.value);
      if (!val || val <= 0) {
        input.classList.add("border-red-400");
        return;
      }

      const customerName = document.getElementById("upay-cust-name").value;
      const customerNote = document.getElementById("upay-cust-note").value;

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span>Minting Order...</span>`;

      try {
        const res = await fetch("/user/dashboard/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: val, customerName, customerNote })
        });
        const data = await res.json();
        if (data.status) {
          document.getElementById("upay-form-stage").classList.add("hidden");
          const qrStage = document.getElementById("upay-qr-stage");
          qrStage.classList.remove("hidden");
          document.getElementById("upay-modal-qr").src = data.qrDataUrl || "";
          document.getElementById("upay-modal-order").textContent = `#${data.order}`;
          document.getElementById("upay-modal-amt").textContent = `₹${Number(data.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
          const checkoutUrl = data.payPath || `/pay/${data.order}`;
          document.getElementById("upay-open-checkout").href = checkoutUrl;
          document.getElementById("upay-copy-link").onclick = () => {
            navigator.clipboard.writeText(window.location.origin + checkoutUrl);
            if (window.Terminal) window.Terminal.notify("Checkout Link Copied!");
          };
          document.getElementById("upay-sim-btn").onclick = async () => {
            if (window.Terminal) {
              await window.Terminal.simulateOrderPaid(data.order);
              this.overlay.remove();
            }
          };
          if (window.Terminal) {
            window.Terminal.notify("Order Created (Redirects to /pay/thanks)!");
            window.Terminal.refreshHistory();
          }
        } else {
          if (window.Terminal) window.Terminal.notify(data.message || "Failed to create order", "warn");
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = `<span>Generate UPay 2.0 Checkout</span>`;
        }
      } catch (e) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<span>Generate UPay 2.0 Checkout</span>`;
      }
    };
  }
}