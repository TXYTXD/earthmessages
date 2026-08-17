import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// Unique id per build — the deployed version.json is compared against the
// id baked into the running bundle to detect when a new version is live.
const buildId = Date.now().toString(36);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "emit-version-json",
      apply: "build" as const,
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: JSON.stringify({ id: buildId }),
        });
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      // Custom minimal service worker (src/sw.js): call notifications with
      // Accept/Decline actions, and nothing else. It has NO fetch handler,
      // so it cannot cache anything or serve a stale app — the problem the
      // old self-destroying worker was shipped to clean up.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      injectManifest: { injectionPoint: undefined },
      includeAssets: ["favicon.png", "favicon.ico"],
      manifest: {
        name: "UMS Messages",
        short_name: "UMSMsg",
        description: "A modern messaging application",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
