import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@orbit/database";

let _auth: ReturnType<typeof betterAuth> | null = null;

function getAuth() {
  if (!_auth) {
    _auth = betterAuth({
      baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
      database: drizzleAdapter(db, {
        provider: "pg",
      }),
      emailAndPassword: {
        enabled: true,
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
      },
      trustedOrigins: [
        process.env.CLIENT_ORIGIN || "http://localhost:3002",
        process.env.BETTER_AUTH_URL || "http://localhost:3001",
      ],
    });
  }
  return _auth;
}

// Proxy so `auth` can be used like a direct export
export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop, _receiver) {
    return (getAuth() as any)[prop];
  },
});

export type Session = typeof auth.$Infer.Session;
