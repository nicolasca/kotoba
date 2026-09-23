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

export function chooseWord(pool: readonly Word[], _progress: Progress, recent: readonly string[] = [], random: () => number = Math.random): Word | null {
  if (!pool.length) return null
  const excluded = recent.slice(-Math.min(3, pool.length - 1))
  let candidates = pool.filter((word) => !excluded.includes(word.kana))
  if (!candidates.length) candidates = [...pool]
  const hira = candidates.filter((word) => word.script === 'hiragana')
  const kata = candidates.filter((word) => word.script === 'katakana')
  if (hira.length && kata.length) candidates = random() < 0.5 ? hira : kata
  return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))]
}

export function wordPoolKey(pool: readonly Word[]): string {
  return pool.map((word) => word.kana).join('|')
}

export function shuffledWordOrder(pool: readonly Word[], random: () => number = Math.random): string[] {
  const lanes = {
    hiragana: pool.filter((word) => word.script === 'hiragana').map((word) => word.kana),
    katakana: pool.filter((word) => word.script === 'katakana').map((word) => word.kana),
  }
  for (const lane of Object.values(lanes)) {
    for (let index = lane.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1))
      ;[lane[index], lane[other]] = [lane[other], lane[index]]
    }
  }

  const order: string[] = []
  while (lanes.hiragana.length || lanes.katakana.length) {
    const hasBoth = lanes.hiragana.length > 0 && lanes.katakana.length > 0
    const lane = hasBoth ? (random() < 0.5 ? lanes.hiragana : lanes.katakana)
      : lanes.hiragana.length ? lanes.hiragana : lanes.katakana
    order.push(lane.pop()!)
  }
  return order
}
