# ⚡ UPay

A high-performance, **full-stack payment processing** solution built with Node.js. UPay combines technical "Cyberpunk" aesthetics with robust UPI integration for a seamless developer and user experience.

---

## 🚀 Features

* **UPI Deep Linking:** Optimized parameters for instant mobile payment triggers.
* **Secure Auth:** Full user registration and login flow.
* **Cyberpunk UI:** High-contrast technical interface built with **Tailwind CSS v4**.
* **Advanced Networking:** Native support for capturing client **IPv6** addresses.
* **Smart Notifications:** Automated email parsing via **Nodemailer**.

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Frontend:** Tailwind CSS v4, Lucide Icons
* **Mail:** Nodemailer (SMTP)
* **Environment:** Optimized for **Termux** / Android

---

## 📦 Installation

1. **Clone the repo:**
   ```bash
   git clone [https://github.com/username/upay.git](https://github.com/username/upay.git)
   cd upay
   ```
2. **Install dependencies:**
```bash
  npm install
  ```
3. **Environment Variables:**
*Create a .env file in the root:*
```bash
PORT=3000
EMAIL=your-email@gmail.com
GOOGLE_APP_PASSWORD=your-app-password
JWT=jwt_secret
mid=paytm_marchent_key
upi=user@upi
MONGO_URI=mongodb+srv://username:<password>@cluster0.bcwfi.mongodb.net/?appName=Cluster0
```
4. **Run Server:**
```bash
npm run start
```


