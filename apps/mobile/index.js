const { registerGlobals } = require('@livekit/react-native');

/*
 * LiveKit MUST register WebRTC globals before Expo Router or
 * any route imports livekit-client.
 */
registerGlobals();

/*
 * Use require(), not static import.
 * Static ES imports are evaluated before registerGlobals().
 */
require('expo-router/entry');
