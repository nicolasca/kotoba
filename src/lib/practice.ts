import { words } from '../data/words.ts'
import { acceptedReadings, answerState } from './romaji.ts'
import { filterWords, shuffledWordOrder, wordPoolKey } from './wordSelection.ts'
import { matchingSpeech } from './speech.ts'
import type { SpeechAlternative } from './speech.ts'
import type { AnswerMode, Progress, SessionStats, Settings, Word, WordRotation } from './types.ts'

export const SPEED_DURATION = 60_000
export interface PracticeState {
  settings: Settings
  progress: Progress
  word: Word | null
  deck: string[]
  deckPoolKey: string
  input: string
  hadError: boolean
  revealed: boolean
  feedback: 'idle' | 'error' | 'success'
  lastResult: Pick<Word, 'kana' | 'meaning'> | null
  stats: SessionStats
  speedStatus: 'ready' | 'running' | 'finished'
  deadline: number | null
  remainingMs: number
  round: number
  answerMode: AnswerMode
}

export type PracticeAction =
  | { type: 'type'; value: string; now: number }
  | { type: 'submit' | 'reveal' | 'start' | 'tick'; now: number }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'clear-feedback'; round: number }
  | { type: 'answer-mode'; mode: AnswerMode }
  | { type: 'speech'; alternatives: SpeechAlternative[]; round: number; now: number }

function emptyStats(): SessionStats { return { correct: 0, errors: 0, skipped: 0 } }

function cleanDeck(pool: readonly Word[], keys: readonly string[], current: string | null = null): string[] {
  const allowed = new Set(pool.map((word) => word.kana))
  const seen = new Set<string>(current ? [current] : [])
  return keys.filter((kana) => {
    if (!allowed.has(kana) || seen.has(kana)) return false
    seen.add(kana)
    return true
  })
}

function drawNext(pool: readonly Word[], queue: readonly string[], previous: string | null = null): { word: Word | null; deck: string[] } {
  if (!pool.length) return { word: null, deck: [] }
  const byKana = new Map(pool.map((word) => [word.kana, word] as const))
  let deck = cleanDeck(pool, queue)
  if (!deck.length) deck = shuffledWordOrder(pool)
  if (previous && deck.length > 1 && deck[0] === previous) [deck[0], deck[1]] = [deck[1], deck[0]]
  const [kana, ...remaining] = deck
  return { word: byKana.get(kana) ?? null, deck: remaining }
}

export function createPractice(saved: { settings: Settings; progress: Progress; rotation?: WordRotation | null }): PracticeState {
  const pool = filterWords(words, saved.settings)
  const deckPoolKey = wordPoolKey(pool)
  const rotation = saved.rotation?.poolKey === deckPoolKey ? saved.rotation : null
  const restoredCurrent = rotation?.current ? pool.find((word) => word.kana === rotation.current) : null
  let word = restoredCurrent ?? null
  let deck = cleanDeck(pool, rotation?.remaining ?? [], word?.kana ?? null)
  if (!word && !rotation && saved.progress.answers === 0) {
    word = pool.find((entry) => entry.kana === 'たまご') ?? null
    deck = shuffledWordOrder(pool).filter((kana) => kana !== word?.kana)
  } else if (!word) {
    const drawn = drawNext(pool, deck, rotation?.current ?? null)
    word = drawn.word
    deck = drawn.deck
  }
  return {
    settings: saved.settings, progress: saved.progress, word, deck, deckPoolKey, input: '', hadError: false,
    revealed: false, feedback: 'idle', lastResult: null, stats: emptyStats(),
    speedStatus: 'ready', deadline: null, remainingMs: SPEED_DURATION, round: 0, answerMode: 'keyboard',
  }
}

function nextWord(state: PracticeState): PracticeState {
  const pool = filterWords(words, state.settings)
  const deckPoolKey = wordPoolKey(pool)
  const samePool = deckPoolKey === state.deckPoolKey
  const queue = samePool ? cleanDeck(pool, state.deck, state.word?.kana ?? null) : []
  const drawn = drawNext(pool, queue, state.word?.kana ?? null)
  return {
    ...state, word: drawn.word, deck: drawn.deck, deckPoolKey,
    input: '', hadError: false, revealed: false, round: state.round + 1,
  }
}

function mistake(state: PracticeState): PracticeState {
  if (!state.word) return state
  if (state.hadError) return { ...state, feedback: 'error' }
  const previous = state.progress.words[state.word.kana] ?? { errors: 0, successes: 0, reviewWeight: 0 }
  return {
    ...state, hadError: true, feedback: 'error', lastResult: null,
    stats: { ...state.stats, errors: state.stats.errors + 1 },
    progress: {
      ...state.progress, errors: state.progress.errors + 1,
      words: { ...state.progress.words, [state.word.kana]: { ...previous, errors: previous.errors + 1, reviewWeight: Math.min(3, previous.reviewWeight + 1) } },
    },
  }
}

function complete(state: PracticeState): PracticeState {
  if (!state.word) return state
  const previous = state.progress.words[state.word.kana] ?? { errors: 0, successes: 0, reviewWeight: 0 }
  return nextWord({
    ...state, feedback: 'success', lastResult: { kana: state.word.kana, meaning: state.word.meaning },
    stats: { ...state.stats, correct: state.stats.correct + 1 },
    progress: {
      ...state.progress, answers: state.progress.answers + 1, correct: state.progress.correct + 1,
      words: { ...state.progress.words, [state.word.kana]: {
        ...previous, successes: previous.successes + 1,
        reviewWeight: state.hadError ? previous.reviewWeight : Math.max(0, previous.reviewWeight - 0.5),
      } },
    },
  })
}

function checkDeadline(state: PracticeState, now: number): PracticeState {
  if (state.speedStatus !== 'running' || state.deadline === null) return state
  const remainingMs = Math.max(0, state.deadline - now)
  return remainingMs > 0 ? { ...state, remainingMs }
    : { ...state, remainingMs: 0, deadline: null, speedStatus: 'finished', feedback: 'idle', lastResult: null }
}

export function practiceReducer(current: PracticeState, action: PracticeAction): PracticeState {
  const state = 'now' in action ? checkDeadline(current, action.now) : current
  if (action.type === 'tick') return state
  if (action.type === 'answer-mode') return state.answerMode === action.mode ? state : {
    ...state, answerMode: action.mode, round: state.round + 1, feedback: 'idle', lastResult: null,
  }
  if (action.type === 'clear-feedback') return action.round === state.round ? { ...state, feedback: 'idle', lastResult: null } : state
  if (action.type === 'settings') {
    if (state.speedStatus === 'running' && action.patch.practice !== 'free') return state
    const settings = { ...state.settings, ...action.patch }
    if (Object.keys(action.patch).every((key) => key === 'translation' || key === 'japaneseFont')) return { ...state, settings }
    return {
      ...nextWord({ ...state, settings }), feedback: 'idle', lastResult: null,
      speedStatus: 'ready', deadline: null, remainingMs: SPEED_DURATION,
      stats: settings.practice !== state.settings.practice ? emptyStats() : state.stats,
    }
  }
  if (action.type === 'start') {
    if (state.settings.practice !== 'speed' || state.speedStatus === 'running' || !state.word) return state
    return {
      ...nextWord(state), stats: emptyStats(), speedStatus: 'running', deadline: action.now + SPEED_DURATION,
      remainingMs: SPEED_DURATION, feedback: 'idle', lastResult: null,
    }
  }
  if (state.settings.practice === 'speed' && state.speedStatus !== 'running') return state
  if (!state.word) return state
  if (action.type === 'reveal') {
    if (state.revealed) return { ...nextWord(state), feedback: 'idle', lastResult: null }
    const missed = mistake(state)
    return {
      ...missed, revealed: true, feedback: 'idle', lastResult: null,
      stats: { ...missed.stats, skipped: missed.stats.skipped + 1 },
      progress: { ...missed.progress, answers: missed.progress.answers + 1 },
    }
  }
  if (state.revealed) return action.type === 'submit' ? { ...nextWord(state), feedback: 'idle', lastResult: null } : state
  if (action.type === 'speech') {
    if (state.answerMode !== 'speech' || action.round !== state.round) return state
    return matchingSpeech(state.word, action.alternatives) ? complete(state) : state
  }
  if (action.type === 'type' && state.answerMode === 'keyboard') {
    const updated = { ...state, input: action.value, lastResult: null }
    const verdict = answerState(action.value, acceptedReadings(state.word))
    if (verdict === 'correct') return complete(updated)
    return verdict === 'incorrect' ? mistake(updated) : { ...updated, feedback: 'idle' }
  }
  if (action.type === 'submit' && state.answerMode === 'keyboard' && state.input.trim()) {
    return answerState(state.input, acceptedReadings(state.word)) === 'correct' ? complete(state) : mistake(state)
  }
  return state
}
