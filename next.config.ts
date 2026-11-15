import type { NextConfig } from 'next';
const config: NextConfig = { output: 'export', images: { unoptimized: true }, poweredByHeader: false,
  reactStrictMode: true, trailingSlash: true,
  webpack(webpackConfig){
    if(process.env.GHOSTHAND_NO_BUILD_CACHE==='1')webpackConfig.cache=false;
    return webpackConfig;
  } };
export default config;
