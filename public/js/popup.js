class UPayDeposit {
    constructor() {
        this.overlay = null;
    }

    open() {
        // Create Overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 transition-all duration-300';
        
        // Modal Content - matching your dashboard's purple and white scheme
        this.overlay.innerHTML = `
            <div class="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden transform transition-all animate-in slide-in-from-bottom duration-300">
                <div class="bg-[#5d45fd] p-8 text-white relative">
                    <button id="close-upay" class="absolute top-6 right-6 opacity-70 hover:opacity-100">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <p class="text-indigo-200 text-xs uppercase tracking-widest font-semibold mb-1">Add Liquidity</p>
                    <h2 class="text-2xl font-bold">Deposit Funds</h2>
                </div>

                <div class="p-8 space-y-6">
                    <div class="space-y-2">
                        <label class="text-slate-400 text-sm font-medium ml-1">Amount to Deposit</label>
                        <div class="relative flex items-center">
                            <span class="absolute left-5 text-2xl font-semibold text-slate-800">₹</span>
                            <input type="number" id="upay-amount" placeholder="0" 
                                class="w-full bg-slate-50 border-2 border-slate-100 focus:border-[#5d45fd] focus:bg-white rounded-2xl py-5 pl-12 pr-6 text-2xl font-bold text-slate-800 outline-none transition-all">
                        </div>
                    </div>

                    <div class="flex gap-3">
                        ${[500, 1000, 2000].map(amt => `
                            <button onclick="document.getElementById('upay-amount').value = ${amt}" 
                                class="flex-1 py-3 rounded-xl border-2 border-slate-100 text-slate-600 font-semibold hover:border-[#5d45fd] hover:text-[#5d45fd] transition-all">
                                +₹${amt}
                            </button>
                        `).join('')}
                    </div>

                    <button id="upay-confirm" class="w-full bg-[#5d45fd] text-white py-5 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 hover:bg-[#4b35e0] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                        <span>Confirm Deposit</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>
                    
                    <p class="text-center text-slate-400 text-xs font-medium">
                        Secure payment powered by UPay Node HK-442
                    </p>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        this._initEvents();
    }

    _initEvents() {
        const closeBtn = document.getElementById('close-upay');
        const confirmBtn = document.getElementById('upay-confirm');
        const input = document.getElementById('upay-amount');

        // Close on X or clicking outside
        closeBtn.onclick = () => this.overlay.remove();
        this.overlay.onclick = (e) => { if(e.target === this.overlay) this.overlay.remove(); };

        // Handle Confirmation
        confirmBtn.onclick = () => {
            const val = input.value;
            if(!val || val <= 0) {
                input.classList.add('border-red-400', 'animate-shake');
                return;
            }

            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `<span class="animate-spin mr-2">◌</span> Processing...`;

            // Logic to send to your Express Backend
             fetch('/user/dashboard/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({amount:parseFloat(input.value)})
                }).then(e=>{return e.json()}).then(e=>{
                  if(e.status){
                    location.href=e.link
                    return 0
                  }
                  alert(e.message);
                  return -1
                });
                
        };
    }
}