import test from 'node:test'
import assert from 'node:assert/strict'
import { words } from '../src/data/words.ts'
import { chooseWord, detectFeatures, filterWords } from '../src/lib/wordSelection.ts'
import { defaultSettings, emptyProgress, readSaved, saveProgress, STORAGE_KEY } from '../src/lib/storage.ts'
import type { Difficulty, WordLength } from '../src/lib/types.ts'

test('métadonnées des difficultés, y compris handakuten et petits kana étrangers', () => {
  assert.deepEqual(detectFeatures('ねこ', 'neko'), ['basic'])
  assert.deepEqual(detectFeatures('たまご', 'tamago'), ['dakuten'])
  assert.deepEqual(detectFeatures('パン', 'pan'), ['handakuten'])
  assert.deepEqual(detectFeatures('はっぱ', 'happa'), ['handakuten', 'small-tsu', 'mixed-complexity'])
  assert.ok(detectFeatures('ぎゅうにゅう', 'gyuunyuu').includes('youon'))
  assert.ok(detectFeatures('コーヒー', 'koohii').includes('long-vowel'))
  assert.ok(detectFeatures('ファイル', 'fairu').includes('mixed-complexity'))
  assert.deepEqual(detectFeatures('おもう', 'omou'), ['basic'])
})

test('chaque filtre et chaque longueur ne retiennent que les mots demandés', () => {
  const difficulties: Difficulty[] = ['basic', 'dakuten', 'youon', 'small-tsu', 'long-vowel', 'mixed-complexity']
  for (const difficulty of difficulties) {
    const pool = filterWords(words, { ...defaultSettings, script: 'mixed', difficulty })
    assert.ok(pool.length > 0, difficulty)
    for (const word of pool) assert.ok(word.features.includes(difficulty) || (difficulty === 'dakuten' && word.features.includes('handakuten')))
  }
  for (const length of ['short', 'medium', 'long'] as WordLength[]) {
    const pool = filterWords(words, { ...defaultSettings, script: 'mixed', length })
    assert.ok(pool.length > 0)
    for (const word of pool) assert.ok(length === 'short' ? word.kana.length <= 3 : length === 'medium' ? word.kana.length >= 4 && word.kana.length <= 5 : word.kana.length >= 6)
  }
})

test('pas de répétition immédiate ; un seul mot et un ensemble vide sont gérés', () => {
  const pool = words.slice(0, 2)
  assert.equal(chooseWord(pool, emptyProgress(), [pool[0].kana])?.kana, pool[1].kana)
  assert.equal(chooseWord([pool[0]], emptyProgress(), [pool[0].kana])?.kana, pool[0].kana)
  assert.equal(chooseWord([], emptyProgress()), null)
})

function seeded() {
  let seed = 123456789
  return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296 }
}

test('le mode mixte équilibre les syllabaires malgré la banque 400 / 300', () => {
  const random = seeded()
  let hira = 0
  for (let i = 0; i < 6000; i++) if (chooseWord(words, emptyProgress(), [], random)?.script === 'hiragana') hira++
  assert.ok(hira > 2800 && hira < 3200, `${hira} sur 6000`)
})

test('les erreurs ne changent pas le tirage aléatoire', () => {
  const pool = words.slice(0, 2)
  const progress = emptyProgress()
  progress.words[pool[0].kana] = { errors: 1, successes: 0, reviewWeight: 1 }
  const random = seeded()
  let selected = 0
  for (let i = 0; i < 3000; i++) if (chooseWord(pool, progress, [], random)?.kana === pool[0].kana) selected++
  assert.ok(selected > 1400 && selected < 1600, `${selected} sur 3000`)
})

test('paramètres et progression survivent à une sauvegarde / relecture', () => {
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
  const settings = { ...defaultSettings, script: 'katakana' as const, translation: false, japaneseFont: 'hand' as const }
  const progress = { ...emptyProgress(), answers: 3, correct: 2, errors: 1, words: { たまご: { errors: 1, successes: 2, reviewWeight: 0.5 } } }
  assert.equal(saveProgress(settings, progress, storage), true)
  assert.ok(values.has(STORAGE_KEY))
  assert.deepEqual(readSaved(storage), { settings, progress })
})

test('un stockage indisponible ou corrompu ne bloque pas l’entraînement', () => {
  const unavailable = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('quota') } }
  assert.deepEqual(readSaved(unavailable), { settings: defaultSettings, progress: emptyProgress() })
  assert.equal(saveProgress(defaultSettings, emptyProgress(), unavailable), false)
  for (const data of ['{broken', 'null', '[]', '{"version":3}']) {
    assert.deepEqual(readSaved({ getItem: () => data }), { settings: defaultSettings, progress: emptyProgress() })
  }
})

test('les anciennes sauvegardes gardent leur progression et adoptent la police Simple', () => {
  const { japaneseFont: _font, ...settings } = defaultSettings
  const progress = { ...emptyProgress(), answers: 12, correct: 10, errors: 2 }
  for (const oldSettings of [settings, { ...settings, japaneseFont: 'missing-font' }]) {
    const restored = readSaved({ getItem: () => JSON.stringify({ version: 1, settings: oldSettings, progress }) })
    assert.equal(restored.settings.japaneseFont, 'sans')
    assert.deepEqual(restored.progress, progress)
  }
})

test('les valeurs locales invalides sont ignorées et les poids sont bornés', () => {
  const restored = readSaved({ getItem: () => JSON.stringify({ version: 1, settings: { script: 'kanji', difficulty: 'unknown', translation: 'false' }, progress: { answers: -2, correct: 999, errors: 'oops', words: { たまご: { errors: 2, successes: -1, reviewWeight: 999 }, '<bad>': {} } } }) })
  assert.deepEqual(restored.settings, defaultSettings)
  assert.equal(restored.progress.answers, 0)
  assert.equal(restored.progress.correct, 0)
  assert.equal(restored.progress.words['たまご'].reviewWeight, 3)
  assert.equal(restored.progress.words['たまご'].successes, 0)
  assert.equal(Object.keys(restored.progress.words).length, 1)
})
