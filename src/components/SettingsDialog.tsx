import { useEffect, useRef } from 'react'
import type { Difficulty, JapaneseFont, Settings, WordLength } from '../lib/types.ts'

const fontChoices: { value: JapaneseFont; label: string; family: string }[] = [
  { value: 'sans', label: 'Simple', family: 'Noto Sans JP' },
  { value: 'hand', label: 'Manuscrite', family: 'Klee One' },
  { value: 'serif', label: 'Livre', family: 'Noto Serif JP' },
]

export const difficultyLabels: Record<Difficulty, string> = {
  all: 'Toutes les difficultés', basic: 'Kana simples', dakuten: 'Dakuten et handakuten · が ぱ',
  youon: 'Petits ゃ ゅ ょ', 'small-tsu': 'Petit っ / ッ', 'long-vowel': 'Voyelles longues · ー',
  'mixed-complexity': 'Difficultés combinées',
}

interface Props {
  open: boolean
  settings: Settings
  poolSize: number
  totalAnswers: number
  onChange: (patch: Partial<Settings>) => void
  onClose: () => void
}

export default function SettingsDialog({ open, settings, poolSize, totalAnswers, onChange, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal()
    if (!open && ref.current?.open) ref.current?.close()
  }, [open])

  return <dialog ref={ref} className="settings-dialog" aria-labelledby="settings-title" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => {
    if (event.target === event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
    }
  }}>
    <div className="dialog-header"><h2 id="settings-title">À votre rythme.</h2><button className="icon-button close-button" onClick={onClose} aria-label="Fermer les paramètres">×</button></div>
    <p className="dialog-intro">Adaptez la lecture à vos habitudes.</p>
    <fieldset className="font-settings" aria-describedby="font-help">
      <legend>Écriture japonaise</legend>
      <p id="font-help">Les mêmes caractères, trois tracés. Choisissez le plus familier.</p>
      <div className="font-choices">
        {fontChoices.map(({ value, label, family }) => <label key={value} className={`font-choice ${settings.japaneseFont === value ? 'is-selected' : ''}`} data-japanese-font={value}>
          <input type="radio" name="japanese-font" value={value} checked={settings.japaneseFont === value} onChange={() => onChange({ japaneseFont: value })}/>
          <span className="font-choice-name">{label}<small>{family}</small></span>
          <span className="font-preview" lang="ja" aria-hidden="true">あきさり<span>アキサリ</span></span>
        </label>)}
      </div>
    </fieldset>
    <label className="setting-field">Difficulté
      <select value={settings.difficulty} onChange={(event) => onChange({ difficulty: event.target.value as Difficulty })}>
        {Object.entries(difficultyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <label className="setting-field">Longueur
      <select value={settings.length} onChange={(event) => onChange({ length: event.target.value as WordLength })}>
        <option value="all">Toutes les longueurs</option><option value="short">Courts · 2 à 3 kana</option>
        <option value="medium">Moyens · 4 à 5 kana</option><option value="long">Longs · 6 kana et plus</option>
      </select>
    </label>
    <p className="pool-count">{poolSize} mots disponibles <span>· petits kana et ー comptés</span></p>
    <label className="toggle-setting"><span>Traduction après une réussite<small>Un bref aperçu du mot que vous venez de lire.</small></span>
      <input type="checkbox" checked={settings.translation} onChange={(event) => onChange({ translation: event.target.checked })} />
    </label>
    <details className="reading-help"><summary>Quelques repères de lecture</summary>
      <p><span lang="ja">し · ち · つ · ふ</span> → shi / si · chi / ti · tsu / tu</p>
      <p><span lang="ja">がっこう</span> → gakkou / gakkoo<br/><span lang="ja">コーヒー</span> → koohii / kōhī<br/><span lang="ja">ほんや</span> → honya / hon’ya</p>
      <p>Gardez les consonnes doubles et les voyelles longues. Les macrons sont facultatifs.</p>
      <p>Un mot compte au plus une erreur par apparition, même après plusieurs essais. Deux réussites sans erreur réduisent le rappel d’une erreur passée.</p>
    </details>
    <div className="dialog-footer"><span>{totalAnswers} réponses enregistrées</span><button className="primary-button" onClick={onClose}>Reprendre <span aria-hidden="true">↵</span></button></div>
  </dialog>
}
