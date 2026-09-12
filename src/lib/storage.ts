import type { Progress, Settings } from './types.ts'

export const STORAGE_KEY = 'kana-lecture:v1'
export const defaultSettings: Settings = { script: 'hiragana', difficulty: 'all', length: 'all', translation: true, practice: 'free', japaneseFont: 'sans' }
export function emptyProgress(): Progress { return { answers: 0, correct: 0, errors: 0, words: {} } }

type StorageReader = Pick<Storage, 'getItem'>
type StorageWriter = Pick<Storage, 'setItem'>
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0

export function readSaved(storage?: StorageReader): { settings: Settings; progress: Progress } {
  const fallback = { settings: { ...defaultSettings }, progress: emptyProgress() }
  try {
    const raw: unknown = JSON.parse((storage ?? window.localStorage).getItem(STORAGE_KEY) ?? 'null')
    if (!isObject(raw) || raw.version !== 1) return fallback
    const s = isObject(raw.settings) ? raw.settings : {}
    const settings = { ...defaultSettings }
    const choices = {
      script: ['hiragana', 'katakana', 'mixed'],
      difficulty: ['all', 'basic', 'dakuten', 'youon', 'small-tsu', 'long-vowel', 'mixed-complexity'],
      length: ['all', 'short', 'medium', 'long'],
      practice: ['free', 'speed'],
      japaneseFont: ['sans', 'hand', 'serif'],
    }
    for (const key of Object.keys(choices) as (keyof typeof choices)[]) {
      if (typeof s[key] === 'string' && choices[key].includes(s[key])) Object.assign(settings, { [key]: s[key] })
    }
    if (typeof s.translation === 'boolean') settings.translation = s.translation
    const p = isObject(raw.progress) ? raw.progress : {}
    const progress: Progress = { answers: count(p.answers), correct: count(p.correct), errors: count(p.errors), words: {} }
    progress.correct = Math.min(progress.correct, progress.answers)
    if (isObject(p.words)) {
      for (const [kana, value] of Object.entries(p.words)) {
        if (!/^[ぁ-ゖァ-ヺー]+$/.test(kana) || !isObject(value)) continue
        progress.words[kana] = {
          errors: count(value.errors), successes: count(value.successes),
          reviewWeight: typeof value.reviewWeight === 'number' && Number.isFinite(value.reviewWeight) ? Math.min(3, Math.max(0, value.reviewWeight)) : 0,
        }
      }
    }
    return { settings, progress }
  } catch { return fallback }
}

export function saveProgress(settings: Settings, progress: Progress, storage?: StorageWriter): boolean {
  try {
    (storage ?? window.localStorage).setItem(STORAGE_KEY, JSON.stringify({ version: 1, settings, progress }))
    return true
  } catch { return false }
}
