import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * eslint-config-next 16 ships flat configs directly, so `FlatCompat` and
 * `@eslint/eslintrc` are no longer needed. The previous config went through
 * FlatCompat and crashed inside the eslintrc schema validator's own error
 * formatter ("Converting circular structure to JSON"), which made `pnpm lint`
 * unrunnable rather than merely failing.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default eslintConfig;
