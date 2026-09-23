import test from 'node:test'
import assert from 'node:assert/strict'
import { words } from '../src/data/words.ts'
import { spokenForms } from '../src/data/spokenForms.ts'
import { matchingSpeech, matchesSpokenWord, normalizeTranscript, transcriptAsKana } from '../src/lib/speech.ts'

const word = (kana: string) => {
  const result = words.find((entry) => entry.kana === kana)
  assert.ok(result, kana)
  return result
}

test('les 700 mots sont reconnus en kana, avec ponctuation et espace du moteur vocal', () => {
  for (const entry of words) assert.ok(matchesSpokenWord(entry, ` ${entry.kana}。 `), entry.kana)
  assert.equal(normalizeTranscript(' ｺｰﾋｰ、 '), 'こーひー')
  assert.ok(matchesSpokenWord(word('たまご'), 'タマゴ'))
})

test('les formes écrites sont uniques par mot et rattachées à la banque', () => {
  for (const [kana, forms] of Object.entries(spokenForms)) {
    const entry = word(kana)
    assert.ok(forms.length > 0)
    const normalized = forms.map(normalizeTranscript)
    assert.equal(new Set(normalized).size, normalized.length, kana)
    for (const form of forms) {
      assert.ok(form.trim())
      assert.ok(matchesSpokenWord(entry, form), `${kana} : ${form}`)
      assert.ok(transcriptAsKana(form)?.match(/^[ぁ-ゖァ-ヶー]+$/u), form)
    }
  }
})

test('accepte les transcriptions courantes et homophones sans exiger des kanji', () => {
  for (const [kana, transcript] of [['たまご', '卵'], ['たまご', '玉子'], ['がっこう', '学校'], ['はし', '箸'], ['はし', '橋'], ['かみ', '紙'], ['かみ', '神'], ['おはよう', 'お早う'], ['ティー', 'Ｔ']]) {
    assert.ok(matchesSpokenWord(word(kana), transcript), `${kana} : ${transcript}`)
  }
})

test('les voyelles longues sont tolérées seulement pour les lectures renseignées', () => {
  assert.ok(matchesSpokenWord(word('がっこう'), 'ガッコー'))
  assert.ok(matchesSpokenWord(word('せんせい'), 'センセー'))
  assert.ok(matchesSpokenWord(word('コーヒー'), 'こおひい'))
  assert.equal(matchesSpokenWord(word('おもう'), 'おもー'), false)
  assert.equal(matchesSpokenWord(word('コーヒー'), 'コヒ'), false)
  assert.equal(matchesSpokenWord(word('がっこう'), 'がこう'), false)
})

test('ne confond pas une variante clavier avec un son différent', () => {
  assert.equal(matchesSpokenWord(word('ティー'), 'チー'), false)
  assert.equal(matchesSpokenWord(word('チーズ'), 'ティーズ'), false)
  assert.equal(matchesSpokenWord(word('ティー'), 'てい'), false)
  assert.equal(matchesSpokenWord(word('ほんや'), 'ほにゃ'), false)
  assert.equal(matchesSpokenWord(word('たまご'), 'たばこ'), false)
  assert.equal(matchesSpokenWord(word('たまご'), '卵です'), false)
  assert.equal(matchesSpokenWord(word('たまご'), 'tamago'), false)
  assert.equal(matchesSpokenWord(word('たまご'), ''), false)
})

test('une bonne hypothèse parmi trois suffit ; une confiance faible reste incertaine', () => {
  const target = word('たまご')
  const accepted = { transcript: '卵', confidence: 0.8 }
  assert.equal(matchingSpeech(target, [{ transcript: '煙草', confidence: 0.9 }, accepted]), accepted)
  assert.equal(matchingSpeech(target, [{ transcript: '卵', confidence: 0.59 }]), undefined)
  assert.ok(matchingSpeech(target, [{ transcript: '卵', confidence: 0 }]))
  assert.equal(matchingSpeech(target, [...Array(3).fill({ transcript: '猫', confidence: 0.9 }), accepted]), undefined)
})

test('le retour de transcription ne révèle jamais de kanji inconnus', () => {
  assert.equal(transcriptAsKana('玉子'), 'たまご')
  assert.equal(transcriptAsKana('珈琲'), 'コーヒー')
  assert.equal(transcriptAsKana('にゃー'), 'にゃー')
  assert.equal(transcriptAsKana('音声認識'), null)
  assert.equal(transcriptAsKana('卵です'), null)
  assert.equal(transcriptAsKana(''), null)
})

test('une longue transcription de syllabes ambiguës ne développe pas les variantes clavier', () => {
  assert.equal(matchesSpokenWord(word('たまご'), 'し'.repeat(200)), false)
})
