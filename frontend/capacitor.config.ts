import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.onechat.app',
  appName: 'OneChat',
  webDir: 'out',
  server: {
    url: 'https://weoncaes.replit.app',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    appendUserAgent: 'OneChat-Android'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#6366f1',
      showSpinner: false
    },
    Geolocation: {
      permissions: ['location']
    }
  }
};

export default config;
