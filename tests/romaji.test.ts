import test from 'node:test'
import assert from 'node:assert/strict'
import { words } from '../src/data/words.ts'
import { acceptedReadings, answerState, kanaReadings, normalizeRomaji } from '../src/lib/romaji.ts'

const word = (kana: string) => {
  const entry = words.find((entry) => entry.kana === kana)
  assert.ok(entry, `Mot absent : ${kana}`)
  return entry
}

test('700 mots entiers et uniques, 400 hiragana / 300 katakana, sans kanji', () => {
  assert.equal(words.length, 700)
  assert.equal(words.filter((entry) => entry.script === 'hiragana').length, 400)
  assert.equal(words.filter((entry) => entry.script === 'katakana').length, 300)
  assert.equal(new Set(words.map((entry) => entry.kana)).size, 700)
  for (const entry of words) {
    assert.match(entry.kana, entry.script === 'hiragana' ? /^[ぁ-ゖ]+$/ : /^[ァ-ヺー]+$/)
    assert.ok([...entry.kana].length >= 2, entry.kana)
    assert.ok(entry.meaning.trim().length > 0, entry.kana)
    assert.ok(entry.romaji.length > 0 && entry.features.length > 0, entry.kana)
    for (const reading of entry.romaji) assert.match(reading, /^[a-z']+$/, entry.kana)
  }
})

test('chaque lecture principale correspond aux kana ; exceptions は des salutations explicites', () => {
  const exceptions: Record<string, string> = { こんにちは: 'konnichiwa', こんばんは: 'konbanwa' }
  for (const entry of words) {
    if (exceptions[entry.kana]) assert.equal(entry.romaji[0], exceptions[entry.kana])
    else assert.ok(kanaReadings(entry.kana).includes(entry.romaji[0]), `${entry.kana} → ${entry.romaji[0]}`)
  }
})

const cases: [string, string[]][] = [
  ['たまご', ['tamago', 'TAMAGO', 'ｔａｍａｇｏ']],
  ['すし', ['sushi', 'susi']], ['ちず', ['chizu', 'tizu']], ['つくえ', ['tsukue', 'tukue']], ['ふく', ['fuku', 'huku']],
  ['しゃしん', ['shashin', 'syasin', 'shasin', 'syashin']], ['ちょっと', ['chotto', 'tyotto', 'cyotto']],
  ['つづく', ['tsuzuku', 'tuzuku', 'tsuduku', 'tsudzuku']],
  ['がっこう', ['gakkou', 'gakkoo', 'gakkō', 'gakkô']], ['いっしょ', ['issho', 'issyo']],
  ['コーヒー', ['koohii', 'kōhī', 'kôhî', ' KŌHĪ ']], ['きょう', ['kyou', 'kyoo', 'kyō']],
  ['せんせい', ['sensei', 'sensee', 'sensē']], ['しゅうまつ', ['shuumatsu', 'syuumatu', 'shūmatsu']],
  ['しょうゆ', ['shouyu', 'shooyu', 'syouyu', 'syooyu', 'shōyu']],
  ['ほんや', ['honya', "hon'ya", 'hon’ya', 'honnya']], ['てんぷら', ['tenpura', 'tempura']],
  ['しんぶん', ['shinbun', 'shimbun', 'sinbun']],
  ['こんにちは', ['konnichiwa', 'konnitiwa', 'konnichiha']], ['こんばんは', ['konbanwa', 'konbanha']],
  ['サンドイッチ', ['sandoicchi', 'sandoitchi', 'sandoitti']],
  ['ティッシュ', ['tisshu', 'tissyu']], ['パーティー', ['paatii', 'pātī']],
  ['スパゲッティ', ['supagetti']], ['ファイル', ['fairu']], ['フォーク', ['fooku', 'fōku']],
]
for (const [kana, readings] of cases) {
  test(`variantes : ${kana}`, () => {
    for (const reading of readings) assert.equal(answerState(reading, acceptedReadings(word(kana))), 'correct', reading)
  })
}

test('les doubles consonnes et voyelles restent nécessaires ; les digrammes étrangers restent distincts', () => {
  for (const [kana, incorrect] of [
    ['コーヒー', 'kohi'], ['コーヒー', 'koohi'], ['がっこう', 'gakou'], ['がっこう', 'gako'],
    ['ティー', 'chii'], ['ティッシュ', 'chisshu'], ['ファイル', 'huairu'], ['おもう', 'omoo'],
    ['ちょっと', 'chiyotto'], ['たまご', 'tamako'],
  ]) assert.notEqual(answerState(incorrect, acceptedReadings(word(kana))), 'correct', `${kana} ≠ ${incorrect}`)
})

test('la saisie incomplète reste neutre, y compris avec une autre romanisation', () => {
  for (const value of ['', 't', 'ta', 'tama', 'tamag']) assert.equal(answerState(value, acceptedReadings(word('たまご'))), 'partial')
  assert.equal(answerState('sy', acceptedReadings(word('しゃしん'))), 'partial')
  assert.equal(answerState('tamax', acceptedReadings(word('たまご'))), 'incorrect')
})

test('petit tsu avant ch, ん avant voyelle, et kana étrangers', () => {
  for (const value of ['matcha', 'maccha', 'mattya']) assert.ok(kanaReadings('まっちゃ').includes(value))
  for (const value of ["ren'ai", 'renai', 'rennai']) assert.ok(kanaReadings('れんあい').includes(value))
  assert.deepEqual(kanaReadings('ディスク'), ['disuku'])
  assert.deepEqual(kanaReadings('ヴァイオリン'), ['vaiorin'])
  assert.equal(normalizeRomaji(' ｋōｈī '), 'koohii')
})
