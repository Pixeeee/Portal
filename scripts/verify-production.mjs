import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const mobile = path.join(root, 'apps/mobile');
const android = path.join(mobile, 'android');
const checks = [];

function record(check, status, command, result, evidence = '', notes = '') {
  checks.push({ check, status, command, result, evidence, notes });
}

function run(check, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    env: { ...process.env, ...(options.env ?? {}) },
    shell: false,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  record(
    check,
    result.status === 0 ? 'PASS' : 'FAIL',
    [command, ...args].join(' '),
    result.status === 0 ? 'exit 0' : `exit ${result.status}`,
    output.split('\n').slice(-8).join('\n'),
    options.notes ?? '',
  );
  return result.status === 0;
}

function text(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function walk(dir) {
  const ignored = new Set(['node_modules', '.git', '.expo', 'dist', 'build', 'coverage', 'android', 'ios']);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignored.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function gitTracked(rel) {
  try {
    return execFileSync('git', ['ls-files', '--', rel], { cwd: root, encoding: 'utf8' }).trim().length > 0;
  } catch {
    return false;
  }
}

function checkStatic(name, ok, evidence, notes = '') {
  record(name, ok ? 'PASS' : 'FAIL', 'static repository inspection', ok ? 'condition true' : 'condition false', evidence, notes);
}

const prodEnv = {
  NODE_ENV: 'production',
  PORT: '8080',
  DATABASE_URL: 'postgres://portal:portal_dev_only@localhost:5432/company_portal',
  REDIS_URL: 'redis://localhost:6379',
  LIVEKIT_URL: 'http://livekit:7880',
  LIVEKIT_PUBLIC_URL: 'wss://livekit.example.com',
  LIVEKIT_API_KEY: 'prodkey',
  LIVEKIT_API_SECRET: 'prodsecretprodsecretprodsecretprodsecret',
  DEVICE_SECRET_PEPPER: '12345678901234567890123456789012',
  EXPO_PUBLIC_API_URL: 'https://portal-api.example.com',
};

console.log('Production verification dependency graph:\n');
console.log(`graph TD
  A[Source tree] --> B[TypeScript]
  A --> C[Unit tests]
  A --> D[Static architecture verify]
  A --> E[Expo native config]
  A --> F[Docker config]
  B --> G[Build]
  C --> H[Production gate table]
  D --> H
  E --> H
  F --> H
  G --> H
  I[Running local infra] --> J[DB migrations]
  I --> K[Backend health]
  I --> L[Realtime integration]
  J --> H
  K --> H
  L --> H
  M[External devices, DNS, TLS, LiveKit public deployment] --> N[Hardware and remote-city gates]
  N --> H`);
console.log('');

run('TypeScript across workspaces', 'npm', ['run', 'typecheck']);
run('Automated unit tests', 'npm', ['test']);
run('Production build/typecheck', 'npm', ['run', 'build']);
run('Static repository verification', 'npm', ['run', 'verify']);
run('Expo Doctor', 'npx', ['expo-doctor'], { cwd: mobile });
run('Expo production public config', 'npx', ['expo', 'config', '--type', 'public'], {
  cwd: mobile,
  env: { NODE_ENV: 'production', EXPO_PUBLIC_API_URL: prodEnv.EXPO_PUBLIC_API_URL },
});
run('Server production config validation', process.execPath, ['--import', 'tsx', '-e', "await import('./apps/server/src/config.ts')"], {
  env: prodEnv,
});
run('Development Docker Compose config', 'docker', ['compose', 'config']);
run('Production Docker Compose example config', 'docker', [
  'compose',
  '--env-file',
  'infrastructure/production/.env.example',
  '-f',
  'infrastructure/production/docker-compose.prod.yml',
  'config',
], { env: { PORTAL_PRODUCTION_ENV_FILE: '.env.example' } });
run('Server production dependency audit', 'npm', ['audit', '--workspace', '@portal/server', '--omit=dev', '--audit-level=moderate']);
run('Android debug build', './gradlew', ['assembleDebug'], {
  cwd: android,
  env: {
    JAVA_HOME: process.env.JAVA_HOME || '/usr/lib/jvm/java-17-openjdk-amd64',
    ANDROID_HOME: process.env.ANDROID_HOME || '/home/kimz/Android/Sdk',
    ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT || '/home/kimz/Android/Sdk',
    NODE_ENV: 'development',
    PATH: `${process.env.ANDROID_HOME || '/home/kimz/Android/Sdk'}/platform-tools:${process.env.PATH ?? ''}`,
  },
});

const appSourceFiles = [
  ...walk(path.join(root, 'apps/mobile/src')),
  ...walk(path.join(root, 'apps/server/src')),
  ...walk(path.join(root, 'packages/contracts/src')),
];
const emulatorRuntimeUrl = appSourceFiles.some((file) => /https?:\/\/10\.0\.2\.2|wss?:\/\/10\.0\.2\.2/.test(fs.readFileSync(file, 'utf8')));
checkStatic(
  'No emulator-only runtime URL in maintained source',
  !emulatorRuntimeUrl,
  emulatorRuntimeUrl ? 'Found literal 10.0.2.2 runtime URL in source' : 'No http/ws 10.0.2.2 runtime URL literals found',
);

const trackedEnv = ['.env', 'apps/mobile/.env', 'apps/server/.env', 'infrastructure/production/.env'].filter(gitTracked);
checkStatic(
  'No committed secret environment files',
  trackedEnv.length === 0,
  trackedEnv.length ? trackedEnv.join(', ') : 'Only env examples are tracked',
);

checkStatic(
  'Production documentation exists',
  exists('PRODUCTION.md') && exists('ENVIRONMENT.md') && exists('FINAL_PRODUCTION_VERIFICATION.md'),
  ['PRODUCTION.md', 'ENVIRONMENT.md', 'FINAL_PRODUCTION_VERIFICATION.md'].filter(exists).join(', ') || 'missing',
);

const fullAudit = spawnSync('npm', ['audit', '--omit=dev', '--audit-level=moderate'], { cwd: root, encoding: 'utf8' });
record(
  'Full dependency audit',
  fullAudit.status === 0 ? 'PASS' : 'FAIL',
  'npm audit --omit=dev --audit-level=moderate',
  fullAudit.status === 0 ? 'exit 0' : `exit ${fullAudit.status}`,
  `${fullAudit.stdout ?? ''}${fullAudit.stderr ?? ''}`.trim().split('\n').slice(-14).join('\n'),
  'Covers the Expo/Metro mobile toolchain as well as server packages.',
);

const adbResult = spawnSync('adb', ['devices'], {
  cwd: root,
  encoding: 'utf8',
  env: {
    ...process.env,
    ANDROID_HOME: process.env.ANDROID_HOME || '/home/kimz/Android/Sdk',
    ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT || '/home/kimz/Android/Sdk',
    PATH: `${process.env.ANDROID_HOME || '/home/kimz/Android/Sdk'}/platform-tools:${process.env.PATH ?? ''}`,
  },
});
const adbOutput = `${adbResult.stdout ?? ''}${adbResult.stderr ?? ''}`.trim();
const attachedDevices = adbOutput.split('\n').slice(1).filter((line) => /\sdevice$/.test(line));
record(
  'Physical Android device tests',
  attachedDevices.length ? 'FAIL' : 'BLOCKED',
  'adb devices; npm run android; hardware checklist',
  attachedDevices.length ? 'devices attached but hardware checklist not automated' : 'no attached devices',
  adbOutput || 'adb produced no output',
  'Camera, microphone, local/remote track render, QR scanner, lifecycle, and remote-city validation are hardware gates.',
);
record('Public staging reachability', 'BLOCKED', 'curl https://.../health/ready; wss LiveKit check', 'not run by this script', 'Requires real DNS/TLS/public backend and LiveKit credentials.', 'Local LAN or Docker checks do not prove Manila-to-Lucena readiness.');

const widths = [36, 8, 44, 18, 54, 44];
function cell(value, width) {
  return String(value ?? '').replace(/\s+/g, ' ').slice(0, width - 1).padEnd(width);
}

console.log('\n| CHECK | STATUS | COMMAND/TEST | RESULT | EVIDENCE | NOTES |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const row of checks) {
  console.log(`| ${cell(row.check, widths[0])} | ${row.status} | ${cell(row.command, widths[2])} | ${cell(row.result, widths[3])} | ${cell(row.evidence, widths[4])} | ${cell(row.notes, widths[5])} |`);
}

const failed = checks.filter((row) => row.status === 'FAIL');
const blocked = checks.filter((row) => row.status === 'BLOCKED');
console.log(`\n${checks.length - failed.length - blocked.length}/${checks.length} checks passed; ${failed.length} failed; ${blocked.length} blocked.`);
if (failed.length) process.exit(1);
