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
  android: {
    // Shell version marker read by the website's update gate. Bump this
    // together with versionCode in android/app/build.gradle whenever the
    // native shell changes, and raise minVersion in
    // public/android-version.json to force users to update via Play Store.
    appendUserAgent: 'UMSAndroid/1',
  },
};

export default config;
