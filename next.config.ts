import type { NextConfig } from 'next';
const config: NextConfig = { output: 'export', images: { unoptimized: true }, poweredByHeader: false,
  reactStrictMode: true, trailingSlash: true };
export default config;
