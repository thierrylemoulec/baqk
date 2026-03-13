import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "adapters/react-router": "src/adapters/react-router.tsx",
    "adapters/next-router": "src/adapters/next-router.tsx",
    "adapters/tanstack-router": "src/adapters/tanstack-router.tsx",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "react-router",
    "react-router-dom",
    "next",
    "next/navigation",
    "@tanstack/react-router",
  ],
  treeshake: true,
});
