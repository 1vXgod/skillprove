import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@skillprove/api-client", "@skillprove/assessment-engine", "@skillprove/permissions", "@skillprove/shared", "@skillprove/validation"],
};

export default config;
