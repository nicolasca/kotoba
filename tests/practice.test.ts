import test from 'node:test'
import assert from 'node:assert/strict'
import { createPractice, practiceReducer, SPEED_DURATION } from '../src/lib/practice.ts'
import { defaultSettings, emptyProgress } from '../src/lib/storage.ts'
import type { PracticeState } from '../src/lib/practice.ts'
import type { Settings } from '../src/lib/types.ts'

const fresh = (settings: Partial<Settings> = {}) => createPractice({ settings: { ...defaultSettings, ...settings }, progress: emptyProgress() })
const type = (state: PracticeState, value: string, now = 1) => practiceReducer(state, { type: 'type', value, now })

test('démarrage libre immédiat ; une bonne lecture avance sans Entrée et remet le champ à zéro', () => {
  let state = fresh()
  assert.equal(state.word?.kana, 'たまご')
  for (const prefix of ['t', 'ta', 'tam', 'tama', 'tamag']) {
    state = type(state, prefix)
    assert.equal(state.feedback, 'idle')
    assert.equal(state.stats.errors, 0)
  }
  state = type(state, 'tamago')
  assert.equal(state.stats.correct, 1)
  assert.equal(state.progress.answers, 1)
  assert.equal(state.input, '')
  assert.notEqual(state.word?.kana, 'たまご')
  assert.equal(state.lastResult?.meaning, 'œuf')
  assert.deepEqual(practiceReducer(state, { type: 'submit', now: 2 }), state)
})

test('erreur douce, une seule erreur par apparition, correction possible sans révélation', () => {
  let state = type(fresh(), 'tamax')
  assert.equal(state.feedback, 'error')
  assert.equal(state.revealed, false)
  assert.equal(state.lastResult, null)
  state = type(state, 'tamaxyz')
  state = practiceReducer(state, { type: 'submit', now: 2 })
  assert.equal(state.stats.errors, 1)
  assert.equal(state.progress.words['たまご'].errors, 1)
  state = type(state, 'tama')
  assert.equal(state.feedback, 'idle')
  state = type(state, 'tamago')
  assert.equal(state.stats.correct, 1)
  assert.equal(state.stats.errors, 1)
  assert.equal(state.progress.words['たまご'].reviewWeight, 1)
})

test('Entrée sur une réponse incomplète valide une erreur ; Entrée vide ne compte pas', () => {
  assert.equal(practiceReducer(fresh(), { type: 'submit', now: 1 }).stats.errors, 0)
  const state = practiceReducer(type(fresh(), 'tama'), { type: 'submit', now: 2 })
  assert.equal(state.stats.errors, 1)
  assert.equal(state.word?.kana, 'たまご')
})

test('révéler puis Entrée ou Escape pour continuer, sans gonfler les bonnes réponses', () => {
  for (const nextAction of ['submit', 'reveal'] as const) {
    let state = practiceReducer(fresh(), { type: 'reveal', now: 1 })
    assert.equal(state.revealed, true)
    assert.equal(state.stats.skipped, 1)
    assert.equal(state.stats.errors, 1)
    assert.equal(state.progress.answers, 1)
    state = type(state, 'tamago')
    assert.equal(state.stats.correct, 0)
    state = practiceReducer(state, { type: nextAction, now: 2 })
    assert.equal(state.revealed, false)
    assert.notEqual(state.word?.kana, 'たまご')
    assert.equal(state.stats.errors, 1)
  }
})

test('révéler après une faute ne recompte pas cette faute', () => {
  const state = practiceReducer(type(fresh(), 'x'), { type: 'reveal', now: 2 })
  assert.equal(state.stats.errors, 1)
  assert.equal(state.progress.errors, 1)
})

test('deux réussites propres ramènent le poids d’une erreur à la normale', () => {
  const initial = fresh()
  let state = type(initial, 'x')
  for (let i = 0; i < 2; i++) state = type({ ...state, word: initial.word, hadError: false, revealed: false }, 'tamago')
  assert.equal(state.progress.words['たまご'].reviewWeight, 0)
})

test('les trois modes respectent le syllabaire, le filtre conserve les paramètres', () => {
  for (const script of ['hiragana', 'katakana', 'mixed'] as const) {
    let state = practiceReducer(fresh(), { type: 'settings', patch: { script } })
    for (let i = 0; i < 40; i++) {
      assert.ok(state.word)
      if (script !== 'mixed') assert.equal(state.word.script, script)
      state = type(state, state.word.romaji[0])
    }
    assert.equal(state.stats.correct, 40)
  }
})

test('un filtre sans résultat reste utilisable puis peut être réinitialisé', () => {
  let state = fresh({ script: 'hiragana', difficulty: 'basic', length: 'long' })
  assert.equal(state.word, null)
  state = practiceReducer(state, { type: 'settings', patch: { difficulty: 'all', length: 'all' } })
  assert.ok(state.word)
})

test('speed : attente explicite, 60 secondes, bonnes réponses et arrêt exact même sans tick préalable', () => {
  let state = fresh({ practice: 'speed' })
  state = type(state, 'tamago', 0)
  assert.equal(state.stats.correct, 0)
  state = practiceReducer(state, { type: 'start', now: 1000 })
  assert.equal(state.deadline, 1000 + SPEED_DURATION)
  assert.equal(state.speedStatus, 'running')
  state = type(state, state.word!.romaji[0], 60_999)
  assert.equal(state.stats.correct, 1)
  state = type(state, state.word!.romaji[0], 61_000)
  assert.equal(state.stats.correct, 1)
  assert.equal(state.speedStatus, 'finished')
  assert.equal(state.remainingMs, 0)
})

test('un onglet retardé ne prolonge pas le chrono et ne pénalise pas après la fin', () => {
  let state = practiceReducer(fresh({ practice: 'speed' }), { type: 'start', now: 0 })
  state = practiceReducer(state, { type: 'reveal', now: 80_000 })
  assert.equal(state.speedStatus, 'finished')
  assert.equal(state.stats.errors, 0)
  const restarted = practiceReducer(state, { type: 'start', now: 90_000 })
  assert.equal(restarted.deadline, 150_000)
  assert.equal(restarted.stats.correct, 0)
})

test('filtres verrouillés pendant le chrono ; retour au mode libre possible', () => {
  const state = practiceReducer(fresh({ practice: 'speed' }), { type: 'start', now: 1 })
  assert.equal(practiceReducer(state, { type: 'settings', patch: { script: 'katakana' } }), state)
  const free = practiceReducer(state, { type: 'settings', patch: { practice: 'free' } })
  assert.equal(free.settings.practice, 'free')
  assert.equal(free.deadline, null)
})

test('désactiver la traduction ne change pas le mot ni une saisie en cours', () => {
  const state = type(fresh(), 'ta')
  const changed = practiceReducer(state, { type: 'settings', patch: { translation: false } })
  assert.equal(changed.word, state.word)
  assert.equal(changed.input, 'ta')
  assert.equal(changed.settings.translation, false)
})

const oral = (state = fresh()) => practiceReducer(state, { type: 'answer-mode', mode: 'speech' })
const say = (state: PracticeState, transcript: string, confidence = 0.9, round = state.round, now = 2) => practiceReducer(state, {
  type: 'speech', alternatives: [{ transcript, confidence }], round, now,
})

test('clavier par défaut, oral facultatif, changement sans perdre le mot ni la saisie', () => {
  const keyboard = type(fresh(), 'tama')
  assert.equal(keyboard.answerMode, 'keyboard')
  const speech = oral(keyboard)
  assert.equal(speech.word, keyboard.word)
  assert.equal(speech.input, 'tama')
  assert.equal(speech.stats, keyboard.stats)
  assert.equal(type(speech, 'tamago'), speech)
  assert.equal(practiceReducer(speech, { type: 'submit', now: 2 }), speech)
  const back = practiceReducer(speech, { type: 'answer-mode', mode: 'keyboard' })
  assert.equal(back.input, 'tama')
  assert.equal(type(back, 'tamago').stats.correct, 1)
  assert.equal(createPractice({ settings: speech.settings, progress: speech.progress }).answerMode, 'keyboard')
})

test('la lecture orale correcte avance une seule fois et utilise les mêmes compteurs', () => {
  const state = oral()
  const next = say(state, '卵')
  assert.equal(next.stats.correct, 1)
  assert.equal(next.progress.answers, 1)
  assert.equal(next.progress.words['たまご'].successes, 1)
  assert.equal(next.lastResult?.kana, 'たまご')
  assert.equal(next.feedback, 'success')
  assert.notEqual(next.word?.kana, state.word?.kana)
  assert.equal(next.answerMode, 'speech')
  assert.equal(say(next, next.word!.kana, 0.9, state.round), next)
})

test('mot différent ou reconnaissance incertaine : aucun score ni erreur modifié', () => {
  const state = oral()
  assert.equal(say(state, '猫'), state)
  assert.equal(say(state, '卵', 0.2), state)
  assert.equal(say(state, ''), state)
  assert.equal(state.stats.errors, 0)
  assert.equal(state.progress.answers, 0)
})

test('ignore les résultats vocaux en mode clavier, après révélation ou changement de mode', () => {
  const keyboard = fresh()
  assert.equal(say(keyboard, '卵'), keyboard)
  const speech = oral(keyboard)
  const revealed = practiceReducer(speech, { type: 'reveal', now: 1 })
  assert.equal(say(revealed, '卵'), revealed)
  assert.equal(revealed.stats.correct, 0)
  assert.equal(revealed.stats.skipped, 1)
  const continued = practiceReducer(revealed, { type: 'submit', now: 2 })
  assert.equal(continued.revealed, false)
  assert.notEqual(continued.word, speech.word)
  const returned = oral(practiceReducer(speech, { type: 'answer-mode', mode: 'keyboard' }))
  assert.equal(say(returned, '卵', 0.9, speech.round), returned)
})

test('une réussite orale après une faute au clavier conserve l’erreur initiale', () => {
  const state = say(oral(type(fresh(), 'x')), '卵')
  assert.equal(state.stats.correct, 1)
  assert.equal(state.stats.errors, 1)
  assert.equal(state.progress.words['たまご'].reviewWeight, 1)
})

test('oral et chrono : aucun crédit avant le départ ou à l’échéance exacte', () => {
  let state = oral(fresh({ practice: 'speed' }))
  assert.equal(say(state, state.word!.kana), state)
  state = practiceReducer(state, { type: 'start', now: 1_000 })
  const keyboard = practiceReducer(state, { type: 'answer-mode', mode: 'keyboard' })
  state = oral(keyboard)
  assert.equal(state.deadline, 61_000)
  assert.equal(state.word, keyboard.word)
  state = say(state, state.word!.kana, 0.9, state.round, 60_999)
  assert.equal(state.stats.correct, 1)
  state = say(state, state.word!.kana, 0.9, state.round, 61_000)
  assert.equal(state.speedStatus, 'finished')
  assert.equal(state.stats.correct, 1)
  assert.equal(state.stats.errors, 0)
})
