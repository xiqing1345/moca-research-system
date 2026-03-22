import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

function resolveSqliteFilePath(databaseUrl: string): string {
  const raw = databaseUrl.startsWith("file:")
    ? databaseUrl.slice("file:".length)
    : databaseUrl;

  if (raw.startsWith("./")) {
    return path.join(process.cwd(), raw.slice(2));
  }

  return raw;
}

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ||
  (() => {
    const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
    const filePath = resolveSqliteFilePath(databaseUrl);

    const adapter = new PrismaBetterSqlite3({
      url: filePath as string & {},
    });
    const client = new PrismaClient({
      adapter,
      log: ["query"],
    });

    return client;
  })();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
