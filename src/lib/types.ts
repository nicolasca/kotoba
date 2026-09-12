export type Script = 'hiragana' | 'katakana'
export type ScriptMode = Script | 'mixed'
export type Feature = 'basic' | 'dakuten' | 'handakuten' | 'youon' | 'small-tsu' | 'long-vowel' | 'mixed-complexity'
export type Difficulty = 'all' | Exclude<Feature, 'handakuten'>
export type WordLength = 'all' | 'short' | 'medium' | 'long'
export type PracticeMode = 'free' | 'speed'
export type AnswerMode = 'keyboard' | 'speech'
export type JapaneseFont = 'sans' | 'hand' | 'serif'

export interface Word {
  kana: string
  romaji: string[]
  meaning: string
  script: Script
  features: Feature[]
}

export interface Settings {
  script: ScriptMode
  difficulty: Difficulty
  length: WordLength
  translation: boolean
  practice: PracticeMode
  japaneseFont: JapaneseFont
}

export interface WordProgress {
  errors: number
  successes: number
  reviewWeight: number
}

export interface Progress {
  answers: number
  correct: number
  errors: number
  words: Record<string, WordProgress>
}

export interface SessionStats {
  correct: number
  errors: number
  skipped: number
}
