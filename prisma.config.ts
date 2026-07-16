import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://adbalance:changeme@localhost:5435/ad_balance",
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
});
