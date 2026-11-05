import { baseConfig } from "@skillprove/config/eslint";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [...nextCoreWebVitals, ...baseConfig];

export default config;
