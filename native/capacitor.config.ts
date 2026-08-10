import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ir.dordaneh.app',
  appName: 'دُردانه',
  // خروجی production باندل وب از packages/app-shell
  webDir: '../packages/app-shell/dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_dordaneh',
      iconColor: '#1ABC9C',
    },
  },
};

export default config;
