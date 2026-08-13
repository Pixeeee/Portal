import test from 'node:test';
import assert from 'node:assert/strict';
const alphabet='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function code(bytes: Uint8Array){const c=Array.from(bytes,v=>alphabet[v%alphabet.length]);return `${c.slice(0,4).join('')}-${c.slice(4,8).join('')}`}
test('code format excludes 0/O/1/I/L',()=>{const c=code(new Uint8Array([0,1,2,3,4,5,6,7]));assert.match(c,/^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/);});
