import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Portal',
  slug: 'company-portal',
  owner: 'pixeee',
  version: '1.0.0',
  platforms: ['android'],
  orientation: 'default',
  scheme: 'portal',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/portal-splash.png',
    backgroundColor: '#111416',
    resizeMode: 'contain',
  },
  android: {
    package: 'com.company.portal',
    permissions: ['CAMERA', 'RECORD_AUDIO', 'POST_NOTIFICATIONS', 'ACCESS_NETWORK_STATE', 'MODIFY_AUDIO_SETTINGS'],
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-status-bar',
    ['expo-build-properties', {
      android: {
        minSdkVersion: 26,
        compileSdkVersion: 36,
        targetSdkVersion: 36,
        buildArchs: ['armeabi-v7a', 'arm64-v8a'],
        enableMinifyInReleaseBuilds: true,
        enableShrinkResourcesInReleaseBuilds: true,
        enableBundleCompression: true,
        useLegacyPackaging: true,
        networkInspector: false,
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
  extra: { eas: { projectId: '61777354-a7fa-4414-bd44-7a4a8e70739c' } },
};

export default config;
