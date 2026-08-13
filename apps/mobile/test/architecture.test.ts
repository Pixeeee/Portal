import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
test('Expo Router entry registers LiveKit globals before router entry',()=>{const s=fs.readFileSync(path.join(root,'index.js'),'utf8');assert.ok(s.indexOf('registerGlobals()')<s.indexOf("expo-router/entry"));});
test('native Android source is generated, not maintained in the repo',()=>{assert.equal(fs.existsSync(path.join(root,'android')),false);});
