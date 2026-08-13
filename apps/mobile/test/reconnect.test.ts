import test from 'node:test';
import assert from 'node:assert/strict';
import { reconnectDelayMs } from '../src/lib/reconnectPolicy';

test('control reconnect follows bounded exponential backoff',()=>{
  assert.deepEqual([0,1,2,3,4,5,6].map(i=>reconnectDelayMs(i,()=>0)),[1000,2000,4000,8000,15000,30000,30000]);
});

test('jitter is bounded',()=>{
  const d=reconnectDelayMs(0,()=>0.999);
  assert.ok(d>=1000 && d<1200);
});
