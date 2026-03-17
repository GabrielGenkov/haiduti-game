/* Values injected by esbuild `define` at build time */
declare const process: { env: Record<string, string | undefined> };

export const API_BASE = process.env.HAIDUTI_API_URL || '';
