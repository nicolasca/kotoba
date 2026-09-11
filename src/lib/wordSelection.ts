import type { Feature, Progress, Settings, Word } from './types.ts'
import { toHiragana } from './romaji.ts'

// These verb endings contain separate vowels, not a long /o/.
const separateVowels = new Set(['おもう', 'まよう', 'かよう', 'よう', 'おう'])

export function detectFeatures(kana: string, primaryReading: string): Feature[] {
  const hira = toHiragana(kana)
  const features: Feature[] = []
  if (/[がぎぐげござじずぜぞだぢづでどばびぶべぼゔ]/.test(hira)) features.push('dakuten')
  if (/[ぱぴぷぺぽ]/.test(hira)) features.push('handakuten')
  if (/[ゃゅょ]/.test(hira)) features.push('youon')
  if (hira.includes('っ')) features.push('small-tsu')
  if (hira.includes('ー') || (!separateVowels.has(hira) && /([aeiou])\1|ou|ei/.test(primaryReading))) features.push('long-vowel')
  // Small loanword vowels are also advanced, even without a youon.
  if (features.length > 1 || /[ぁぃぅぇぉ]/.test(hira)) features.push('mixed-complexity')
  return features.length ? features : ['basic']
}

export function filterWords(words: readonly Word[], settings: Pick<Settings, 'script' | 'difficulty' | 'length'>): Word[] {
  return words.filter((word) => {
    if (settings.script !== 'mixed' && word.script !== settings.script) return false
    if (settings.difficulty !== 'all' && !word.features.includes(settings.difficulty)
      && !(settings.difficulty === 'dakuten' && word.features.includes('handakuten'))) return false
    const size = [...word.kana].length
    return settings.length === 'all' || (settings.length === 'short' ? size <= 3 : settings.length === 'medium' ? size >= 4 && size <= 5 : size >= 6)
  })
}

export function chooseWord(pool: readonly Word[], progress: Progress, recent: readonly string[] = [], random: () => number = Math.random): Word | null {
  if (!pool.length) return null
  const excluded = recent.slice(-Math.min(3, pool.length - 1))
  let candidates = pool.filter((word) => !excluded.includes(word.kana))
  if (!candidates.length) candidates = [...pool]
  const hira = candidates.filter((word) => word.script === 'hiragana')
  const kata = candidates.filter((word) => word.script === 'katakana')
  if (hira.length && kata.length) candidates = random() < 0.5 ? hira : kata
  const weights = candidates.map((word) => 1 + (progress.words[word.kana]?.reviewWeight ?? 0))
  let cursor = random() * weights.reduce((sum, weight) => sum + weight, 0)
  for (let i = 0; i < candidates.length; i++) {
    cursor -= weights[i]
    if (cursor < 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}
