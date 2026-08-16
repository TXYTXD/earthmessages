import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.umsmessages.app',
  appName: 'UMS Messages',
  webDir: 'dist',
  // Load the live site (same approach as the Windows desktop app), so the
  // Android app is always on the latest version the moment a deploy goes
  // out — no store review wait, no stale bundles.
  server: {
    url: 'https://umsmessages.net',
    cleartext: false,
  },
};

export default config;
