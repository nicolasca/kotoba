import test from 'node:test'
import assert from 'node:assert/strict'
import { createSpeechSession, recognitionConstructor } from '../src/lib/speechRecognition.ts'
import type { Recognition, RecognitionEvent, SpeechStatus } from '../src/lib/speechRecognition.ts'
import type { SpeechAlternative } from '../src/lib/speech.ts'

class FakeRecognition implements Recognition {
  lang = ''
  continuous = true
  interimResults = true
  maxAlternatives = 1
  onstart: Recognition['onstart'] = null
  onspeechend: Recognition['onspeechend'] = null
  onresult: Recognition['onresult'] = null
  onerror: Recognition['onerror'] = null
  onend: Recognition['onend'] = null
  starts = 0
  stops = 0
  aborts = 0
  start() { this.starts++ }
  stop() { this.stops++ }
  abort() { this.aborts++ }
}

const resultEvent = (alternatives: SpeechAlternative[] = [{ transcript: '卵', confidence: 0.9 }], isFinal = true): RecognitionEvent => ({
  resultIndex: 0, results: [Object.assign(alternatives, { isFinal })],
})

function setup() {
  const recognizers: FakeRecognition[] = []
  const statuses: SpeechStatus[] = []
  const results: SpeechAlternative[][] = []
  const timers: { callback: () => void; milliseconds: number; cancelled: boolean }[] = []
  const session = createSpeechSession({
    create: () => { const recognition = new FakeRecognition(); recognizers.push(recognition); return recognition },
    onStatus: (status) => statuses.push(status),
    onResult: (alternatives) => results.push(alternatives),
    timer: (callback, milliseconds) => {
      const timer = { callback, milliseconds, cancelled: false }
      timers.push(timer)
      return () => { timer.cancelled = true }
    },
  })
  return { session, recognizers, statuses, results, timers }
}

test('aucun micro au montage, une seule écoute japonaise par activation', () => {
  const { session, recognizers, statuses, timers } = setup()
  assert.equal(recognitionConstructor(), null) // No browser in the Node test process.
  assert.equal(recognizers.length, 0)
  session.start()
  session.start()
  const recognition = recognizers[0]
  assert.equal(recognizers.length, 1)
  assert.equal(recognition.starts, 1)
  assert.equal(recognition.lang, 'ja-JP')
  assert.equal(recognition.continuous, false)
  assert.equal(recognition.interimResults, false)
  assert.equal(recognition.maxAlternatives, 3)
  assert.deepEqual(statuses.at(-1), { phase: 'starting' })
  recognition.onstart?.()
  assert.deepEqual(statuses.at(-1), { phase: 'listening' })
  recognition.onspeechend?.()
  recognition.onspeechend?.()
  assert.equal(recognition.stops, 1)
  assert.deepEqual(statuses.at(-1), { phase: 'processing' })
  assert.equal(timers[0].milliseconds, 15_000)
  session.dispose()
})

test('ignore le provisoire, émet un seul résultat final et libère le micro', () => {
  const { session, recognizers, results, timers, statuses } = setup()
  session.start()
  const recognition = recognizers[0]
  const callback = recognition.onresult!
  callback(resultEvent(undefined, false))
  assert.equal(results.length, 0)
  callback(resultEvent())
  callback(resultEvent())
  assert.equal(results.length, 1)
  assert.equal(recognition.aborts, 1)
  assert.equal(recognition.onend, null)
  assert.ok(timers[0].cancelled)
  assert.deepEqual(statuses.at(-1), { phase: 'idle' })
  assert.equal(recognizers.length, 1) // A result never restarts the microphone.
})

test('borne les données reçues et utilise le résultat à son index', () => {
  const { session, recognizers, results } = setup()
  session.start()
  const event = resultEvent([{ transcript: '猫', confidence: 0.9 }])
  const final = resultEvent([
    { transcript: ' ', confidence: 0.7 },
    { transcript: '卵', confidence: Number.NaN },
    { transcript: 'あ'.repeat(300), confidence: 0.8 },
    { transcript: '玉子', confidence: 1 },
  ])
  recognizers[0].onresult?.({ resultIndex: 1, results: [event.results[0], final.results[0]] })
  assert.equal(results[0].length, 2)
  assert.deepEqual(results[0][0], { transcript: '卵', confidence: 0 })
  assert.equal(results[0][1].transcript.length, 200)
})

test('annuler ignore même les callbacks déjà en attente, y compris après une nouvelle écoute', () => {
  const { session, recognizers, statuses, results, timers } = setup()
  session.start()
  const old = recognizers[0]
  const lateResult = old.onresult!
  const lateError = old.onerror!
  const lateStart = old.onstart!
  const lateEnd = old.onend!
  session.cancel()
  assert.equal(old.aborts, 1)
  assert.ok(timers[0].cancelled)
  session.start()
  const count = statuses.length
  lateResult(resultEvent())
  lateError({ error: 'network' })
  lateStart()
  lateEnd()
  timers[0].callback()
  assert.equal(results.length, 0)
  assert.equal(statuses.length, count)
  recognizers[1].onresult?.(resultEvent())
  assert.equal(results.length, 1)
})

test('expiration arrête le micro et permet une nouvelle tentative', () => {
  const { session, recognizers, statuses, timers, results } = setup()
  session.start()
  const lateResult = recognizers[0].onresult!
  timers[0].callback()
  assert.deepEqual(statuses.at(-1), { phase: 'error', issue: 'timeout' })
  assert.equal(recognizers[0].aborts, 1)
  lateResult(resultEvent())
  assert.equal(results.length, 0)
  session.start()
  assert.equal(recognizers.length, 2)
  session.dispose()
})

test('chaque échec fournit un retour utilisable sans résultat ni redémarrage', () => {
  for (const [error, issue] of [['not-allowed', 'permission'], ['service-not-allowed', 'permission'], ['audio-capture', 'microphone'], ['network', 'network'], ['language-not-supported', 'language'], ['no-speech', 'silence'], ['aborted', 'silence'], ['unexpected', 'unknown']]) {
    const { session, recognizers, statuses, results, timers } = setup()
    session.start()
    recognizers[0].onerror?.({ error })
    assert.deepEqual(statuses.at(-1), { phase: 'error', issue })
    assert.equal(results.length, 0)
    assert.equal(recognizers[0].aborts, 1)
    assert.ok(timers[0].cancelled)
    assert.equal(recognizers.length, 1)
  }
})

test('fin sans parole ou résultat vide : invitation à réessayer', () => {
  for (const emptyResult of [false, true]) {
    const { session, recognizers, statuses, results } = setup()
    session.start()
    if (emptyResult) recognizers[0].onresult?.(resultEvent([]))
    else recognizers[0].onend?.()
    assert.deepEqual(statuses.at(-1), { phase: 'error', issue: 'silence' })
    assert.equal(results.length, 0)
  }
})

test('un refus synchrone du navigateur est traité et le micro libéré', () => {
  const recognition = new FakeRecognition()
  recognition.start = () => { throw new DOMException('Permission denied', 'NotAllowedError') }
  const statuses: SpeechStatus[] = []
  const session = createSpeechSession({ create: () => recognition, onStatus: (status) => statuses.push(status), onResult: () => assert.fail('Unexpected result') })
  session.start()
  assert.equal(recognition.aborts, 1)
  assert.deepEqual(statuses.at(-1), { phase: 'error', issue: 'permission' })
})

test('démontage définitif : aucun callback ou redémarrage ne subsiste', () => {
  const { session, recognizers, statuses, results, timers } = setup()
  session.start()
  const callback = recognizers[0].onresult!
  const count = statuses.length
  session.dispose()
  callback(resultEvent())
  timers[0].callback()
  session.cancel()
  session.start()
  assert.equal(recognizers[0].aborts, 1)
  assert.equal(recognizers.length, 1)
  assert.equal(statuses.length, count)
  assert.equal(results.length, 0)
  assert.ok(timers[0].cancelled)
})
