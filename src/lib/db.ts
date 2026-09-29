import { PrismaClient } from "@/generated/prisma/client";
import { ConfigError } from "@/lib/api/errors";
import { PrismaNeon } from "@prisma/adapter-neon";

const g = globalThis as unknown as { prisma?: PrismaClient };
export function db(): PrismaClient {
  if (!g.prisma) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new ConfigError("Database is not configured");
    g.prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }) });
  }
  return g.prisma;
}
export const dbConfigured = () => !!process.env.DATABASE_URL;
