import type { NextConfig } from "next";
import { readFileSync } from "fs";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    APP_VERSION: version,
    APP_HOSTNAME: process.env.APP_HOSTNAME || "seal3d.app",
  },
};

export default nextConfig;
