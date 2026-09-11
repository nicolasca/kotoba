import type { SpeechAlternative } from './speech.ts'

export type SpeechIssue = 'unsupported' | 'permission' | 'microphone' | 'network' | 'language' | 'silence' | 'timeout' | 'unknown'
export type SpeechStatus = { phase: 'idle' | 'starting' | 'listening' | 'processing' } | { phase: 'error'; issue: SpeechIssue }

export interface RecognitionResult {
  isFinal: boolean
  length: number
  [index: number]: SpeechAlternative
}
export interface RecognitionEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }

// The prefixed API is still used by several browsers and is absent from lib.dom.d.ts.
export interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onspeechend: (() => void) | null
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

export function recognitionConstructor(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null
  const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null
}

function issueFor(error: string): SpeechIssue {
  if (error === 'not-allowed' || error === 'service-not-allowed') return 'permission'
  if (error === 'audio-capture') return 'microphone'
  if (error === 'network') return 'network'
  if (error === 'language-not-supported') return 'language'
  if (error === 'no-speech' || error === 'aborted') return 'silence'
  return 'unknown'
}

type SetTimer = (callback: () => void, milliseconds: number) => () => void
const setTimer: SetTimer = (callback, milliseconds) => {
  const id = globalThis.setTimeout(callback, milliseconds)
  return () => globalThis.clearTimeout(id)
}

/** One explicit click = one short listening attempt. No automatic microphone restart. */
export function createSpeechSession(options: {
  create: () => Recognition
  onStatus: (status: SpeechStatus) => void
  onResult: (alternatives: SpeechAlternative[]) => void
  timer?: SetTimer
}) {
  let current: Recognition | null = null
  let attempt = 0
  let disposed = false
  let cancelTimer: (() => void) | undefined

  function release() {
    attempt++
    cancelTimer?.()
    cancelTimer = undefined
    const previous = current
    current = null
    if (previous) {
      previous.onstart = previous.onspeechend = previous.onresult = previous.onerror = previous.onend = null
      try { previous.abort() } catch { /* Already ended in some engines. */ }
    }
  }

  function cancel() {
    release()
    if (!disposed) options.onStatus({ phase: 'idle' })
  }

  function start() {
    if (disposed || current) return
    const token = ++attempt
    const valid = () => !disposed && token === attempt
    const fail = (issue: SpeechIssue) => {
      if (!valid()) return
      release()
      options.onStatus({ phase: 'error', issue })
    }
    try {
      const recognition = options.create()
      current = recognition
      recognition.lang = 'ja-JP'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 3
      recognition.onstart = () => { if (valid()) options.onStatus({ phase: 'listening' }) }
      let stopping = false
      recognition.onspeechend = () => {
        if (!valid() || stopping) return
        stopping = true
        options.onStatus({ phase: 'processing' })
        try { recognition.stop() } catch { fail('unknown') }
      }
      recognition.onresult = (event) => {
        if (!valid()) return
        const result = event.results[event.resultIndex]
        if (!result?.isFinal) return
        const alternatives = Array.from({ length: Math.min(result.length, 3) }, (_, index) => result[index])
          .filter((alternative) => typeof alternative?.transcript === 'string' && alternative.transcript.trim())
          .map((alternative) => ({ transcript: alternative.transcript.slice(0, 200), confidence: Number.isFinite(alternative.confidence) ? alternative.confidence : 0 }))
        release()
        options.onStatus(alternatives.length ? { phase: 'idle' } : { phase: 'error', issue: 'silence' })
        if (alternatives.length) options.onResult(alternatives)
      }
      recognition.onerror = (event) => fail(issueFor(event.error))
      recognition.onend = () => fail('silence')
      options.onStatus({ phase: 'starting' })
      cancelTimer = (options.timer ?? setTimer)(() => fail('timeout'), 15_000)
      recognition.start()
    } catch (error) {
      fail(error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'SecurityError') ? 'permission' : 'unknown')
    }
  }

  return { start, cancel, dispose: () => { disposed = true; release() } }
}
