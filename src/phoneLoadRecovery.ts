/** Retry only the read-only projection handshake. Never replay phone mutations. */
export function createPhoneLoadRecovery(options: {
  request: () => string;
  exhausted: () => void;
  schedule?: (callback: () => void, delay: number) => number;
  cancel?: (id: number) => void;
}) {
  const schedule = options.schedule || ((callback, delay) => window.setTimeout(callback, delay))
  const cancel = options.cancel || (id => window.clearTimeout(id))
  let timer: number | undefined
  let operation = ''; let epoch = 0
  function stop() { epoch++; operation = ''; if (timer !== undefined) cancel(timer); timer = undefined }
  function start() {
    stop()
    const run = epoch
    const delays = [1500, 3000, 6000, 6000]
    function attempt(index: number) {
      if (run !== epoch) return
      operation = options.request()
      if (run !== epoch) return
      if (!operation) { stop(); return }
      timer = schedule(() => {
        timer = undefined
        if (run !== epoch) return
        if (index + 1 < delays.length) attempt(index + 1)
        else { stop(); options.exhausted() }
      }, delays[index])
    }
    attempt(0)
  }
  return { start, stop, owns: (id: string) => Boolean(operation) && id === operation }
}
