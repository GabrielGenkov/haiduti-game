/* Values injected by esbuild `define` at build time */
declare const process: { env: Record<string, string | undefined> };

export const API_BASE = process.env.HAIDUTI_API_URL || '';
export const CDN_BASE = process.env.HAIDUTI_CDN_URL || 'https://d2xsxph8kpxj0f.cloudfront.net/310519663406922472/2gR6Yf82SmCj2Vzvaty3Kv';
