import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const checks=[];
function check(name,ok,detail=''){checks.push({name,ok:Boolean(ok),detail});}
function exists(rel){return fs.existsSync(path.join(root,rel));}
function text(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function contains(rel,needle){return exists(rel)&&text(rel).includes(needle);}
function walk(dir){
  const ignored=new Set(['node_modules','.git','.expo','dist','build','coverage']);
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    if(e.isDirectory()&&ignored.has(e.name))return [];
    return e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)];
  });
}

function gitTracked(rel){
  try{
    return execFileSync(
      'git',
      ['ls-files','--',rel],
      {cwd:root,encoding:'utf8'}
    ).trim().length>0;
  }catch{
    return false;
  }
}

const required=[
  'package.json','.env.example','docker-compose.yml','apps/mobile/package.json','apps/mobile/app.config.ts','apps/mobile/index.js','apps/mobile/eas.json',
  'apps/server/package.json','apps/server/src/app.ts','apps/server/src/realtime.ts','apps/server/src/security.ts','apps/server/src/livekit.ts',
  'packages/contracts/package.json','packages/contracts/src/index.ts','docs/ARCHITECTURE.md','docs/API.md','docs/SECURITY.md','docs/TESTING.md','docs/DEPLOYMENT.md','docs/HARDWARE_ACCEPTANCE.md'
];
for(const f of required)check(`required: ${f}`,exists(f));

const routes=['index.tsx','onboarding.tsx','connect.tsx','scan.tsx','qr.tsx','portal/[code].tsx','outgoing/[requestId].tsx','incoming/[requestId].tsx','live/[sessionId].tsx','favorites.tsx','history.tsx','trusted.tsx','diagnostics.tsx','edit-portal.tsx','(tabs)/index.tsx','(tabs)/recents.tsx','(tabs)/settings.tsx'];
for(const f of routes)check(`Expo route: ${f}`,exists(`apps/mobile/src/app/${f}`));

check('npm workspaces configured',contains('package.json','"workspaces"')&&contains('package.json','apps/*')&&contains('package.json','packages/*'));
check('Expo Router dependency',contains('apps/mobile/package.json','expo-router'));
check('Expo SDK 57 dependency',contains('apps/mobile/package.json','"expo": "^57')||contains('apps/mobile/package.json','"expo": "~57'));
check('Android-only Expo platform',contains('apps/mobile/app.config.ts',"platforms: ['android']"));
check('minSdk 26 through config plugin',contains('apps/mobile/app.config.ts','minSdkVersion: 26')&&contains('apps/mobile/app.config.ts','expo-build-properties'));
check('target/compile API 36',contains('apps/mobile/app.config.ts','targetSdkVersion: 36')&&contains('apps/mobile/app.config.ts','compileSdkVersion: 36'));
check('LiveKit Expo plugin',contains('apps/mobile/app.config.ts','@livekit/react-native-expo-plugin'));
check('WebRTC config plugin',contains('apps/mobile/app.config.ts','@config-plugins/react-native-webrtc'));
check('LiveKit globals before router',text('apps/mobile/index.js').indexOf('registerGlobals()')<text('apps/mobile/index.js').indexOf("expo-router/entry"));
check('SecureStore device secret',contains('apps/mobile/src/lib/identity.ts','expo-secure-store')&&contains('apps/mobile/src/lib/identity.ts','getRandomBytesAsync(32)'));
check('Expo SQLite local cache',contains('apps/mobile/src/lib/localDb.ts','expo-sqlite'));
check('Favorites local',contains('apps/mobile/src/lib/localDb.ts','favorite_place'));
check('Recents local',contains('apps/mobile/src/lib/localDb.ts','recent_portal'));
check('Settings local',contains('apps/mobile/src/lib/localDb.ts','app_setting'));
check('QR scanner',contains('apps/mobile/src/app/scan.tsx','CameraView'));
check('QR is preview-first',!contains('apps/mobile/src/app/scan.tsx','connect('));
check('Typed Portal state',contains('packages/contracts/src/index.ts',"'INCOMING_REQUEST'")&&contains('packages/contracts/src/index.ts',"'RECONNECTING'"));
check('Typed request states',contains('packages/contracts/src/index.ts',"'PENDING'")&&contains('packages/contracts/src/index.ts',"'BUSY'"));
check('Typed session states',contains('packages/contracts/src/index.ts',"'ACTIVE'")&&contains('packages/contracts/src/index.ts',"'FAILED'"));
check('Restricted public-code alphabet',contains('packages/contracts/src/index.ts','A-HJ-KM-NP-Z2-9'));
check('Bounded realtime reconnect',contains('apps/mobile/src/lib/reconnectPolicy.ts','30000'));
check('Live screen keep awake',contains('apps/mobile/src/app/live/[sessionId].tsx','useKeepAwake'));
check('Live screen media controls',contains('apps/mobile/src/app/live/[sessionId].tsx','setMicrophoneEnabled')&&contains('apps/mobile/src/app/live/[sessionId].tsx','setCameraEnabled')&&contains('apps/mobile/src/app/live/[sessionId].tsx','restartTrack'));
check('Live controls auto-hide',contains('apps/mobile/src/app/live/[sessionId].tsx','3000'));
check('No recording feature',!walk(path.join(root,'apps/mobile/src')).some(f=>/recording|recordVideo/i.test(fs.readFileSync(f,'utf8'))));
check('Node backend',contains('apps/server/package.json','"@types/node"'));
check('Postgres backend',contains('apps/server/package.json','"pg"'));
check('Redis backend',contains('apps/server/package.json','ioredis'));
check('LiveKit server SDK',contains('apps/server/package.json','livekit-server-sdk'));
check('Device auth header',contains('apps/server/src/security.ts','PortalDevice'));
check('Backend stores secret hash',contains('apps/server/src/security.ts','createHmac')&&contains('apps/server/src/app.ts','device_secret_hash'));
check('Request expiration',contains('apps/server/src/app.ts',"status='EXPIRED'"));
check('Busy rule',contains('apps/server/src/app.ts','SESSION_BUSY')||contains('apps/server/src/app.ts','CONNECTION_BUSY'));
check('Idempotency support',contains('apps/server/src/app.ts','idempotency'));
check('Directional trust table',contains('apps/server/src/db/migrations/V001__initial_schema.sql','trusted_peer'));
check('Active-session DB invariant',exists('apps/server/src/db/migrations/V004__active_session_invariant.sql'));
check('Redis presence',contains('apps/server/src/presence.ts','setex')||contains('apps/server/src/presence.ts','set('));
check('Realtime endpoint',contains('apps/server/src/realtime.ts','/api/v1/realtime'));
check('Push fallback',contains('apps/server/src/push.ts','exp.host')||contains('apps/server/src/push.ts','expo'));
check('LiveKit token backend-only',contains('apps/server/src/livekit.ts','AccessToken'));
check('Production wss fail-fast',contains('apps/server/src/config.ts',"startsWith('wss://')"));
check('Production secret pepper fail-fast',contains('apps/server/src/config.ts','deviceSecretPepper.length < 32'));
check('Flyway replacement ordered SQL migrations',exists('apps/server/src/db/migrations/V001__initial_schema.sql')&&exists('apps/server/src/migrate.ts'));
check('Postgres Docker service',contains('docker-compose.yml','postgres:'));
check('Redis Docker service',contains('docker-compose.yml','redis:'));
check('LiveKit Docker service',contains('docker-compose.yml','livekit:'));
check('No committed native Android source',!gitTracked('apps/mobile/android'));
const applicationSourceRoots=[
  path.join(root,'apps/mobile/src'),
  path.join(root,'apps/server/src'),
  path.join(root,'packages/contracts/src')
];

const applicationSourceFiles=applicationSourceRoots.flatMap(
  dir=>fs.existsSync(dir)?walk(dir):[]
);

check(
  'No Kotlin/Gradle application source',
  !applicationSourceFiles.some(f=>/\.(kt|kts|gradle)$/.test(f))
);
const accountCheckRoots=[
  path.join(root,'apps/mobile/src'),
  path.join(root,'apps/server/src'),
  path.join(root,'packages/contracts/src')
];

const accountSourceFiles=accountCheckRoots.flatMap(
  dir=>fs.existsSync(dir)?walk(dir):[]
);

check(
  'No user/role/RBAC routes',
  !accountSourceFiles.some(f=>{
    const source=fs.readFileSync(f,'utf8');
    return /userRole|rolePermission|RBAC|email\/password login/i.test(source);
  })
);
check('No .env committed',!gitTracked('.env'));
check('No emulator-only runtime URL in maintained source',!applicationSourceFiles.some(f=>/https?:\/\/10\.0\.2\.2|wss?:\/\/10\.0\.2\.2/.test(fs.readFileSync(f,'utf8'))));
check('Hardware acceptance 20 scenarios',(text('docs/HARDWARE_ACCEPTANCE.md').match(/- \[ \]/g)||[]).length===20);

for(const f of ['package.json','apps/mobile/package.json','apps/server/package.json','packages/contracts/package.json']){try{JSON.parse(text(f));check(`valid JSON: ${f}`,true)}catch(e){check(`valid JSON: ${f}`,false,String(e))}}

const failed=checks.filter(c=>!c.ok);
for(const c of checks)console.log(`${c.ok?'PASS':'FAIL'}  ${c.name}${c.detail?` — ${c.detail}`:''}`);
console.log(`\n${checks.length-failed.length}/${checks.length} checks passed; ${failed.length} failed.`);
if(failed.length)process.exit(1);
