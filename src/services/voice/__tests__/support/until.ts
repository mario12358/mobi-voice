// Waits for the asynchronous voice pipeline (SQLite writes, TTS timers) by elapsed time, not by a count of
// event-loop turns: slower CI machines need more turns for the same work.
export async function until(condition: () => boolean, timeoutMs = 3_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('condition not met');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
