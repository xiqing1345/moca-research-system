import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Vercel: artifacts stored in /tmp (ephemeral per invocation)
  // For persistent artifact storage, set ARTIFACTS_DIR to an external storage path.
};

export default nextConfig;
