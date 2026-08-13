import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Portal',
  slug: 'company-portal',
  version: '1.0.0',
  platforms: ['android'],
  orientation: 'default',
  scheme: 'portal',
  userInterfaceStyle: 'dark',
  android: {
    package: 'com.company.portal',
    permissions: ['CAMERA', 'RECORD_AUDIO', 'POST_NOTIFICATIONS', 'ACCESS_NETWORK_STATE', 'MODIFY_AUDIO_SETTINGS'],
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    ['expo-build-properties', {
      android: {
        minSdkVersion: 26,
        compileSdkVersion: 36,
        targetSdkVersion: 36,
        usesCleartextTraffic: process.env.NODE_ENV !== 'production',
      },
    }],
    ['expo-camera', {
      cameraPermission: 'Portal uses the camera to scan Portal QR codes and during live Portal sessions.',
      microphonePermission: 'Portal uses the microphone during live Portal sessions.',
      recordAudioAndroid: true,
      barcodeScannerEnabled: true,
    }],
    ['expo-secure-store', { configureAndroidBackup: true }],
    'expo-notifications',
    ['@livekit/react-native-expo-plugin', {
      android: { audioType: 'communication', enableScreenShareService: false },
    }],
    '@config-plugins/react-native-webrtc',
  ],
  experiments: { typedRoutes: true },
  extra: { eas: { projectId: process.env.EXPO_PROJECT_ID ?? '' } },
};

export default config;
