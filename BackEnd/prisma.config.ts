import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  schema: "./src/prisma",
  datasource: {
    // process.env (not prisma's env() helper, which throws when unset) so that
    // `prisma generate` — run by postinstall, never touches a DB — still works
    // in environments without DATABASE_URL, e.g. the frontend's Render build,
    // which installs the whole pnpm workspace. migrate/db commands still fail
    // loudly if it's missing.
    url: process.env.DATABASE_URL ?? "",
  },
  migrations:{
    seed: "tsx src/prisma/seed.ts",
  }
});
