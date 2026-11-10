import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // ⚠️ El appId es el identificador PERMANENTE en Google Play: una vez subida la
  // primera versión no se puede cambiar. Si quieres otro, cámbialo antes.
  appId: 'com.timewinner.app',
  appName: 'Time winner',
  webDir: 'dist',
  android: {
    // La app se sirve desde https://localhost dentro del móvil (necesario para crypto.subtle)
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#4DA8DA',
    },
  },
}

export default config
