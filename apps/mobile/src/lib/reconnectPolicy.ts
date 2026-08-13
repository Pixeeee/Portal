const STEPS = [1000, 2000, 4000, 8000, 15000, 30000] as const;
export function reconnectDelayMs(attempt:number, random=Math.random){
  const base=STEPS[Math.min(Math.max(0,attempt),STEPS.length-1)]!;
  const jitter=Math.floor(random()*Math.min(1000,base*0.2));
  return base+jitter;
}
