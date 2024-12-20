import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    globals: true,
    isolate: false,
  },
}); 
