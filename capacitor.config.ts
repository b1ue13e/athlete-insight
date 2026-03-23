import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.athlete.insight',
  appName: 'Athlete Insight',
  webDir: 'dist',
  appVersion: '1.0.0',
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
  }
};

export default config;
