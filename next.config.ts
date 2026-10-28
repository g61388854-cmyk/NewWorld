import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

// script-src допускает 'unsafe-inline' из-за встроенных скриптов Next.js; переход на nonce — отдельная задача.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const headers = [...securityHeaders];
    // В режиме разработки Next.js использует eval, поэтому политика включается только в production.
    if (process.env.NODE_ENV === "production") headers.push({ key: "Content-Security-Policy", value: csp });
    return [
      { source: "/(.*)", headers },
      // Страницы кабинета и входа не кэшируются браузером и промежуточными прокси.
      { source: "/app/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/login/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
