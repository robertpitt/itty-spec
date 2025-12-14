import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/router.ts', 'src/contract.ts', 'src/openapi/index.ts'],
  format: ['esm', 'cjs'],
  exports: true,
  dts: true,
  clean: true,
  minify: true,
  outDir: 'dist',
});
