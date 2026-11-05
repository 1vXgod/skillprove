import { baseConfig } from "@skillprove/config/eslint";

export default [...baseConfig, { ignores: ["expo-env.d.ts"] }];
