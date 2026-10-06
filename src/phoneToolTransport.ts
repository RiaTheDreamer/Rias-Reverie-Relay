import { PHONE_TOOL_DEFINITIONS } from './phoneTools'

export type PhoneToolTransport = 'native' | 'xml'
/** Registration is installation-wide in Lumiverse, never a per-chat toggle. */
export function createPhoneToolTransport(deps: {
  read(): Promise<unknown>; write(mode: PhoneToolTransport): Promise<void>;
  canRegister(): boolean; register(tool: typeof PHONE_TOOL_DEFINITIONS[number]): void;
  unregister(name: string): void; revoke(): void;
  xmlOnly?: boolean;
}) {
  let mode: PhoneToolTransport = 'xml', registered = false
  function apply() {
    for (const tool of PHONE_TOOL_DEFINITIONS) deps.unregister(tool.name)
    registered = false
    deps.revoke()
    if (!deps.xmlOnly && mode === 'native' && deps.canRegister()) {
      for (const tool of PHONE_TOOL_DEFINITIONS) deps.register(tool)
      registered = true
    }
  }
  const ready = deps.read().then(value => {
    if (value !== undefined && value !== null && value !== 'native' && value !== 'xml') throw new Error('Incoming text transport setting is damaged. Native phone tools stayed disabled.')
    mode = deps.xmlOnly || value === 'xml' ? 'xml' : 'native'
    apply()
    if (deps.xmlOnly && value !== 'xml') return deps.write('xml')
  })
  let lane: Promise<unknown> = ready.catch(() => {})
  function change(value: unknown) {
    const next = lane.then(async () => {
      if (value !== 'native' && value !== 'xml') throw new Error('Choose Native tools or XML incoming texts.')
      if (deps.xmlOnly && value === 'native') throw new Error('This build uses XML incoming texts only. Native phone declarations are disabled.')
      if (value === 'native' && !deps.canRegister()) throw new Error('Grant the existing tools permission before enabling native phone tools, or choose XML.')
      await deps.write(value)
      mode = value
      apply()
    })
    lane = next.catch(() => {})
    return next
  }
  return { ready, change, refresh: apply, mode: () => mode, native: () => mode === 'native' && registered && deps.canRegister() }
}
