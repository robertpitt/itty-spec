import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/router.ts', 'src/contract.ts', 'src/openapi/index.ts'],
  format: ['esm', 'cjs'],
  clean: true,
  sourcemap: false,
  minify: true,
  outDir: 'dist',
  // Explicitly mark zod as external to prevent bundling
  // Users must install zod separately when using zod schemas
  external: ['zod', 'zod/v4'],
});
