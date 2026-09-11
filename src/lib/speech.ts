import { words } from '../data/words.ts'
import { spokenForms } from '../data/spokenForms.ts'
import { kanaReadings, normalizeRomaji, toHiragana } from './romaji.ts'
import type { Word } from './types.ts'

export interface SpeechAlternative { transcript: string; confidence: number }

export function normalizeTranscript(text: string): string {
  return toHiragana(text.normalize('NFKC')).toLowerCase().replace(/[\s\p{P}]/gu, '')
}

const kanaOnly = /^[ぁ-ゖー]+$/

export function matchesSpokenWord(word: Word, transcript: string): boolean {
  const heard = normalizeTranscript(transcript)
  if (!heard) return false
  if ([word.kana, ...(spokenForms[word.kana] ?? [])].some((form) => normalizeTranscript(form) === heard)) return true
  // A recognizer can render a long vowel with ー even for a hiragana exercise.
  if (!kanaOnly.test(heard)) return false
  // Use Hepburn here, never keyboard aliases: チー (chii) must not match ティー (tii).
  const phonetic = (reading: string) => normalizeRomaji(reading)
  try {
    const reading = phonetic(kanaReadings(heard, { variants: false })[0])
    // Keep the syllable boundary in n'ya: ほんや and ほにゃ are different readings.
    const expected = kanaReadings(word.kana, { variants: false })[0]
    const candidates = expected.includes("'") ? [expected] : word.romaji
    return candidates.some((candidate) => phonetic(candidate) === reading)
  }
  catch { return false }
}

export function matchingSpeech(word: Word, alternatives: SpeechAlternative[]): SpeechAlternative | undefined {
  // Some engines report 0 when confidence isn't supplied. Never interpret that as a score.
  return alternatives.slice(0, 3).find((alternative) =>
    (alternative.confidence === 0 || alternative.confidence >= 0.6) && matchesSpokenWord(word, alternative.transcript))
}

const writtenToKana = new Map<string, string>()
for (const word of words) {
  for (const form of [word.kana, ...(spokenForms[word.kana] ?? [])]) {
    writtenToKana.set(normalizeTranscript(form), word.kana)
  }
}

/** Keep even the transcription feedback readable without knowing kanji. */
export function transcriptAsKana(transcript: string): string | null {
  const text = normalizeTranscript(transcript)
  return writtenToKana.get(text) ?? (kanaOnly.test(text) ? text : null)
}
