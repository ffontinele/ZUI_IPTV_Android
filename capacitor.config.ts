import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zui.iptv.android',
  appName: 'ZUI IPTV',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: { enabled: true },
  },
  android: { allowMixedContent: true },
};

export default config;
