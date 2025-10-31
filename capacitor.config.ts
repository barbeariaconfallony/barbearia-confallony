import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9f21f3e007444a039636b1edf0c1d6d2',
  appName: 'confa1-06266-73093',
  webDir: 'dist',
  server: {
    url: 'https://9f21f3e0-0744-4a03-9636-b1edf0c1d6d2.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
      sound: 'beep.wav'
    },
    OneSignal: {
      appId: '4121bac8-40b0-4967-b5dd-e2eab4d39832'
    }
  }
};

export default config;
