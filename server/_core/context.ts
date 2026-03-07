import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { parse as parseCookies } from "cookie";
import { COOKIE_NAME } from "../../shared/const";
import { verifyJWT } from "../auth";
import { getUserById } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    const cookies = parseCookies(opts.req.headers.cookie ?? "");
    const token = cookies[COOKIE_NAME];
    if (token) {
      const payload = await verifyJWT(token);
      if (payload) {
        const found = await getUserById(parseInt(payload.sub, 10));
        user = found ?? null;
      }
    }
  } catch {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
