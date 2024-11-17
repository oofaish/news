/** @type {import('next').NextConfig} */
const nextConfig = {};

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: true,
});

module.exports = withPWA(nextConfig);
