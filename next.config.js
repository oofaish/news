// next.config.js
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Additional PWA options can be added here
});

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  reactStrictMode: true,
  // Add any other Next.js configuration options here
});

module.exports = nextConfig;
