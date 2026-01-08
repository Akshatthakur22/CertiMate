// Helpers to mimic human-like sending behavior and reduce spam risk.
// We add randomized delays and shape traffic to avoid burst patterns.

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomMs(minSeconds: number, maxSeconds: number) {
  return randomInt(minSeconds * 1000, maxSeconds * 1000);
}

export function chunkVariable<T>(items: T[], minSize: number, maxSize: number): T[][] {
  const result: T[][] = [];
  let i = 0;
  while (i < items.length) {
    const remaining = items.length - i;
    const size = Math.min(remaining, randomInt(minSize, maxSize));
    result.push(items.slice(i, i + size));
    i += size;
  }
  return result;
}

// Assigns tasks to N lanes, ensuring a per-lane delay between sends.
// Returns an array of start times (ms from now) for each task index.
export function scheduleWithLanes(taskCount: number, lanes: number, minDelaySec: number, maxDelaySec: number): number[] {
  const laneAvailableAt: number[] = new Array(lanes).fill(0);
  const starts: number[] = new Array(taskCount).fill(0);
  for (let t = 0; t < taskCount; t++) {
    // Pick lane that becomes available first
    let laneIndex = 0;
    for (let i = 1; i < lanes; i++) {
      if (laneAvailableAt[i] < laneAvailableAt[laneIndex]) laneIndex = i;
    }
    const delay = randomMs(minDelaySec, maxDelaySec);
    const startAt = laneAvailableAt[laneIndex];
    starts[t] = startAt;
    // Next availability after this task finishes sending, respecting inter-send delay
    laneAvailableAt[laneIndex] = startAt + delay;
  }
  return starts;
}
