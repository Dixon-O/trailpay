import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `lightning`/`ln-service` and `better-sqlite3` load native bindings and
  // .proto files from their package dirs at runtime — keep them external so
  // Next doesn't bundle them and break file-relative path resolution.
  serverExternalPackages: ["lightning", "ln-service", "better-sqlite3"],
};

export default nextConfig;
