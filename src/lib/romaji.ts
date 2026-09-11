/** Kana-based variants keep ティ (ti) distinct from チ (chi / ti). */
const singles: Record<string, string[]> = Object.fromEntries(
  `あ:a い:i う:u え:e お:o
か:ka き:ki く:ku け:ke こ:ko
さ:sa し:shi,si す:su せ:se そ:so
た:ta ち:chi,ti つ:tsu,tu て:te と:to
な:na に:ni ぬ:nu ね:ne の:no
は:ha ひ:hi ふ:fu,hu へ:he ほ:ho
ま:ma み:mi む:mu め:me も:mo
や:ya ゆ:yu よ:yo ら:ra り:ri る:ru れ:re ろ:ro わ:wa を:wo,o
が:ga ぎ:gi ぐ:gu げ:ge ご:go
ざ:za じ:ji,zi ず:zu ぜ:ze ぞ:zo
だ:da ぢ:ji,di,zi づ:zu,du,dzu で:de ど:do
ば:ba び:bi ぶ:bu べ:be ぼ:bo
ぱ:pa ぴ:pi ぷ:pu ぺ:pe ぽ:po ゔ:vu`
    .split(/\s+/).map((entry) => {
      const [kana, values] = entry.split(':')
      return [kana, values.split(',')]
    }),
)

const pairs: Record<string, string[]> = {
  しゃ: ['sha', 'sya'], しゅ: ['shu', 'syu'], しょ: ['sho', 'syo'],
  ちゃ: ['cha', 'tya', 'cya'], ちゅ: ['chu', 'tyu', 'cyu'], ちょ: ['cho', 'tyo', 'cyo'],
  じゃ: ['ja', 'jya', 'zya'], じゅ: ['ju', 'jyu', 'zyu'], じょ: ['jo', 'jyo', 'zyo'],
  ぢゃ: ['ja', 'dya'], ぢゅ: ['ju', 'dyu'], ぢょ: ['jo', 'dyo'],
  ふぁ: ['fa'], ふぃ: ['fi'], ふぇ: ['fe'], ふぉ: ['fo'], ふゅ: ['fyu'],
  てぃ: ['ti'], でぃ: ['di'], てゅ: ['tyu'], でゅ: ['dyu'],
  とぅ: ['tu'], どぅ: ['du'], しぇ: ['she', 'sye'], ちぇ: ['che', 'tye'], じぇ: ['je', 'jye', 'zye'],
  うぃ: ['wi'], うぇ: ['we'], うぉ: ['wo'], いぇ: ['ye'],
  つぁ: ['tsa'], つぃ: ['tsi'], つぇ: ['tse'], つぉ: ['tso'],
  ゔぁ: ['va'], ゔぃ: ['vi'], ゔぇ: ['ve'], ゔぉ: ['vo'],
}

for (const [kana, stem] of Object.entries({ き: 'k', ぎ: 'g', に: 'n', ひ: 'h', び: 'b', ぴ: 'p', み: 'm', り: 'r' })) {
  for (const [small, vowel] of Object.entries({ ゃ: 'a', ゅ: 'u', ょ: 'o' })) {
    pairs[kana + small] = [stem + 'y' + vowel]
  }
}

export function toHiragana(kana: string): string {
  return kana.normalize('NFC').replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
}

export function normalizeRomaji(input: string): string {
  const long: Record<string, string> = { ā: 'aa', ī: 'ii', ū: 'uu', ē: 'ee', ō: 'oo', â: 'aa', î: 'ii', û: 'uu', ê: 'ee', ô: 'oo' }
  return input.normalize('NFKC').toLowerCase().replace(/[āīūēōâîûêô]/g, (char) => long[char])
    .replace(/[’‘ʼ]/g, "'").replace(/\s/g, '')
}

export function kanaReadings(value: string, options: { variants?: boolean } = {}): string[] {
  const kana = toHiragana(value)
  let readings = ['']
  for (let i = 0; i < kana.length; i++) {
    const char = kana[i]
    if (char === 'ー') {
      readings = readings.map((reading) => reading + (reading.match(/[aeiou]$/)?.[0] ?? ''))
      continue
    }
    if (char === 'ん') {
      const next = pairs[kana.slice(i + 1, i + 3)] ?? singles[kana[i + 1]] ?? ['']
      const variants = /^[aeiouy]/.test(next[0]) ? ["n'", 'n', 'nn']
        : /^[bmp]/.test(next[0]) ? ['n', 'm'] : ['n']
      const choices = options.variants === false ? variants.slice(0, 1) : variants
      readings = readings.flatMap((reading) => choices.map((n) => reading + n))
      continue
    }
    const doubled = char === 'っ'
    if (doubled) i++
    const pair = pairs[kana.slice(i, i + 2)]
    let variants = pair ?? singles[kana[i]]
    if (!variants) throw new Error(`Kana non pris en charge : ${value} (${kana[i]})`)
    if (pair) i++
    if (doubled) variants = variants.flatMap((reading) => reading.startsWith('ch')
      ? ['t' + reading, 'c' + reading] : [reading[0] + reading])
    if (options.variants === false) variants = variants.slice(0, 1)
    readings = readings.flatMap((reading) => variants.map((part) => reading + part))
  }
  return [...new Set(readings)]
}

const spellings: Record<string, string[]> = {
  shi: ['shi', 'si'], chi: ['chi', 'ti'], tsu: ['tsu', 'tu'], fu: ['fu', 'hu'], ji: ['ji', 'zi'],
  sha: ['sha', 'sya'], shu: ['shu', 'syu'], sho: ['sho', 'syo'],
  cha: ['cha', 'tya', 'cya'], chu: ['chu', 'tyu', 'cyu'], cho: ['cho', 'tyo', 'cyo'],
  ja: ['ja', 'jya', 'zya'], ju: ['ju', 'jyu', 'zyu'], jo: ['jo', 'jyo', 'zyo'],
}

function spellingVariants(reading: string): string[] {
  const parts = reading.split(/(shi|chi|tsu|fu|ji|sha|shu|sho|cha|chu|cho|ja|ju|jo)/)
  return parts.reduce<string[]>((result, part) => result.flatMap((prefix) =>
    (spellings[part] ?? [part]).map((suffix) => prefix + suffix)), [''])
}

const cache = new Map<string, string[]>()

export function acceptedReadings(word: { kana: string; romaji: string[] }): string[] {
  const key = word.kana + ':' + word.romaji.join('|')
  const cached = cache.get(key)
  if (cached) return cached
  const result = [...new Set([
    ...kanaReadings(word.kana),
    ...word.romaji.flatMap(spellingVariants),
  ].map(normalizeRomaji))]
  cache.set(key, result)
  return result
}

export function answerState(input: string, readings: readonly string[]): 'correct' | 'partial' | 'incorrect' {
  const normalized = normalizeRomaji(input)
  if (!normalized) return 'partial'
  if (readings.includes(normalized)) return 'correct'
  return readings.some((reading) => reading.startsWith(normalized)) ? 'partial' : 'incorrect'
}
