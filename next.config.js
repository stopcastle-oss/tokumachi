/** @type {import('next').NextConfig} */

const withNextIntl = require("next-intl/plugin")(
  "./src/i18n/config.ts"
);

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "iackatkodhacdhhhffyw.supabase.co",
    ],
  },
};

module.exports = withNextIntl(nextConfig);
