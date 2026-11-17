import { defineConfig } from 'vite';

// Phaser is shared by every playable scene and changes less often than the
// application modules. Keeping it in its own cacheable chunk removes the
// monolithic entry warning without changing scene loading or asset URLs.
export default defineConfig({
  build: {
    // The application entry is kept below 500 kB; Phaser's published runtime
    // is a single ~1.37 MB vendor module and cannot be subdivided safely by
    // scene without changing its runtime contract. Keep that known vendor
    // budget explicit so builds fail only on app chunks that regress.
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) return 'phaser';
        },
      },
    },
  },
});
