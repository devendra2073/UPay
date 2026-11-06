import express from "express";
import dot from "dotenv";
import fs from "fs";
import cloudinary from "cloudinary";
import mongoose from "mongoose";
import path from "path";
import cors from "cors";
import apirouter from "./routes/api.routes.js";
import userRouter from "./routes/user.routes.js";
import cookieParser from "cookie-parser";
import payrouter from "./routes/pay.routes.js";

dot.config();
const PORT = process.env.PORT || 3000;
const URI = process.env.MONGO_URI || null;

cloudinary.config({
  cloud_name: process.env.my_cloud_name,
  api_key: process.env.my_key,
  api_secret: process.env.my_secret
});

if (URI) {
  await mongoose.connect(URI);
}

const app = express();
app.use(cors());
app.use(cookieParser());
// Allow up to 12MB JSON payloads for base64 dispute screenshots & merchant logo uploads
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));
app.use(express.static(path.join(import.meta.dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(import.meta.dirname, "views"));

// Dynamic SEO Routes for Google & Meta Crawlers
app.get("/robots.txt", (req, res) => {
  const host = `${req.protocol}://${req.get("host") || "u-pay-seven.vercel.app"}`;
  res.type("text/plain").send(
    `User-agent: *\nAllow: /\nAllow: /pay/\nAllow: /documentation.html\nAllow: /privacy.html\nAllow: /termsOfservices.html\nDisallow: /user/dashboard/api/\nSitemap: ${host}/sitemap.xml\n`
  );
});

app.get("/sitemap.xml", (req, res) => {
  const host = `${req.protocol}://${req.get("host") || "u-pay-seven.vercel.app"}`;
  const now = new Date().toISOString();
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${host}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${host}/user/login</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${host}/documentation.html</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${host}/privacy.html</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${host}/termsOfservices.html</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`);
});

app.use("/api", apirouter);
app.use("/pay", payrouter);
app.use("/user", userRouter);

app.get("/*path", async (req, res) => {
  const info = `${req.method} ${req.path} : ${req.ip} : ${new Date().toLocaleString()}\n`;
  fs.appendFile("system.log", info, (e) => {
    if (e) console.log("Error in log");
  });
  res.status(403).render("403", { ip: req.ip });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`UPay 2.0 Server running at ${PORT}`);
});