import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
function tracked(rel:string){return execFileSync('git',['ls-files','--',rel],{cwd:root,encoding:'utf8'}).trim().length>0}
test('Expo Router entry registers LiveKit globals before router entry',()=>{const s=fs.readFileSync(path.join(root,'index.js'),'utf8');assert.ok(s.indexOf('registerGlobals()')<s.indexOf("expo-router/entry"));});
test('native Android source is generated, not maintained in the repo',()=>{assert.equal(tracked('android'),false);});
test('Android API URL has no emulator-only fallback',()=>{const s=fs.readFileSync(path.join(root,'src/lib/config.ts'),'utf8');assert.equal(s.includes("Platform.OS === 'android' ? 'http://10.0.2.2:8080'"),false);assert.match(s,/EXPO_PUBLIC_API_URL is required/);});
