import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sebastiankristof.kartuliread',
  appName: 'KartuliRead',
  webDir: 'dist',
  backgroundColor: '#f8fafc',
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DARK',
    },
  },
};

export default config;
