import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import SettingsDialog, { difficultyLabels } from './components/SettingsDialog.tsx'
import SpeechAnswer from './components/SpeechAnswer.tsx'
import { CheckIcon, EnterIcon, SettingsIcon } from './components/Icons.tsx'
import { words } from './data/words.ts'
import { createPractice, practiceReducer } from './lib/practice.ts'
import { readSaved, saveProgress } from './lib/storage.ts'
import { filterWords } from './lib/wordSelection.ts'
import type { ScriptMode, Settings } from './lib/types.ts'
import type { SpeechAlternative } from './lib/speech.ts'

const scriptLabels: Record<ScriptMode, string> = { hiragana: 'Hiragana', katakana: 'Katakana', mixed: 'Mixte' }

export default function App() {
  const [state, dispatch] = useReducer(practiceReducer, undefined, () => createPractice(readSaved()))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [saved, setSaved] = useState(true)
  const [compositionDraft, setCompositionDraft] = useState<string | null>(null)
  const composing = useRef(false)
  const composedValue = useRef<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const startRef = useRef<HTMLButtonElement>(null)
  const speechButtonRef = useRef<HTMLButtonElement>(null)
  const speechModeRef = useRef<HTMLButtonElement>(null)
  const { settings, word, stats, speedStatus } = state
  const speed = settings.practice === 'speed'
  const running = speed && speedStatus === 'running'
  const active = !!word && (!speed || running)
  const oral = state.answerMode === 'speech'
  const pool = useMemo(() => filterWords(words, settings), [settings])
  const updateSettings = (patch: Partial<Settings>) => dispatch({ type: 'settings', patch })
  const recognize = useCallback((alternatives: SpeechAlternative[]) => {
    dispatch({ type: 'speech', alternatives, round: state.round, now: Date.now() })
  }, [state.round])
  const focusAnswer = useCallback(() => {
    if (oral) {
      const button = speechButtonRef.current
      if (button && !button.disabled) button.focus({ preventScroll: true })
      else speechModeRef.current?.focus({ preventScroll: true })
    } else inputRef.current?.focus({ preventScroll: true })
  }, [oral])

  useEffect(() => { setSaved(saveProgress(settings, state.progress)) }, [settings, state.progress])
  useEffect(() => {
    if (settingsOpen) return
    if (active) focusAnswer()
    else startRef.current?.focus({ preventScroll: true })
  }, [settingsOpen, state.round, state.revealed, active, speedStatus, focusAnswer])
  useEffect(() => {
    if (!running) return
    const tick = () => dispatch({ type: 'tick', now: Date.now() })
    const timer = window.setInterval(tick, 100)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick) }
  }, [running])
  useEffect(() => {
    if (state.feedback !== 'success') return
    const timer = window.setTimeout(() => dispatch({ type: 'clear-feedback', round: state.round }), 1800)
    return () => window.clearTimeout(timer)
  }, [state.feedback, state.round])
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (settingsOpen || event.isComposing || composing.current || event.repeat) return
      if (event.key === 'Escape' && active) {
        event.preventDefault()
        dispatch({ type: 'reveal', now: Date.now() })
        focusAnswer()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen, active, focusAnswer])

  const feedback = state.feedback === 'error' ? 'Pas tout à fait. Vous pouvez corriger.'
    : state.feedback === 'success' ? (oral ? 'Mot reconnu !' : 'Bien lu !') : ''
  const successNotice = state.feedback === 'success' ? <span className="success-feedback"><CheckIcon/>{settings.translation && state.lastResult ? <><span lang="ja">{state.lastResult.kana}</span><span className="feedback-dash">—</span>{state.lastResult.meaning}</> : feedback}</span> : null

  return <div className="app-shell">
    <header className="site-header">
      <div className="brand" aria-label="Kotoba, lecture mot à mot"><span className="wordmark">kotoba<span>.</span></span><span className="brand-caption">LECTURE, MOT À MOT</span></div>
      <button className="settings-button" onClick={() => setSettingsOpen(true)} disabled={running} title={running ? 'Les réglages seront disponibles après le chrono.' : 'Paramètres'} aria-label="Paramètres"><SettingsIcon/><span>Paramètres</span></button>
    </header>

    <main>
      <nav className="script-selector" aria-label="Syllabaire">
        {(Object.keys(scriptLabels) as ScriptMode[]).map((script) => <button key={script} aria-pressed={settings.script === script} disabled={running} onClick={() => updateSettings({ script })}>{scriptLabels[script]}</button>)}
      </nav>

      <section className="practice" aria-label="Entraînement à la lecture">
        <div className="practice-toolbar">
          <div className="practice-selector" aria-label="Mode d’entraînement">
            <button aria-pressed={!speed} onClick={() => updateSettings({ practice: 'free' })} title={running ? 'Quitter le chrono et revenir au mode libre' : undefined}>Libre</button>
            <span className="toolbar-divider" aria-hidden="true"/>
            <button aria-pressed={speed} disabled={running} onClick={() => updateSettings({ practice: 'speed' })}>60 secondes</button>
          </div>
          {running ? <span className={`timer ${state.remainingMs <= 10000 ? 'timer-ending' : ''}`} aria-label={`${Math.ceil(state.remainingMs / 1000)} secondes restantes`}><span className="timer-icon" aria-hidden="true"/> {Math.ceil(state.remainingMs / 1000)}<span>s</span></span>
            : <span className="session-score"><strong>{stats.correct}</strong> {stats.correct > 1 ? 'mots lus' : 'mot lu'}</span>}
        </div>

        {!word ? <div className="empty-state"><span className="eyebrow">AUCUN MOT</span><h1>Un autre choix ?</h1><p>Aucun mot ne correspond à ces filtres.</p><button className="primary-button" onClick={() => updateSettings({ difficulty: 'all', length: 'all' })}>Afficher tous les mots</button></div>
          : speed && speedStatus !== 'running' ? <div className="speed-screen">
            <span className="eyebrow">LE CHRONO</span>
            {speedStatus === 'finished' ? <>
              <h1>Une minute, bien lue.</h1>
              <div className="speed-result"><strong>{stats.correct}</strong><span>mots / minute</span></div>
              <dl className="result-details"><div><dt>Mots parcourus</dt><dd>{stats.correct + stats.skipped}</dd></div><div><dt>Bonnes réponses</dt><dd>{stats.correct}</dd></div><div><dt>Mots avec erreur</dt><dd>{stats.errors}</dd></div></dl>
              {stats.skipped > 0 && <p className="result-note">Dont {stats.skipped} {stats.skipped > 1 ? 'réponses révélées' : 'réponse révélée'}.</p>}
              <p className="sr-only" role="status">Chrono terminé. {stats.correct} mots lus, {stats.errors} erreurs.</p>
            </> : <><h1>Une minute pour lire.</h1><p>Autant de mots que possible.<br/>Le chrono démarre quand vous êtes prêt.</p><span className="speed-sixty" aria-hidden="true">60<span>s</span></span></>}
            <button ref={startRef} className="primary-button start-button" onClick={() => dispatch({ type: 'start', now: Date.now() })}>{speedStatus === 'finished' ? 'Recommencer' : 'Démarrer'}<EnterIcon/></button>
            <span className="start-hint">Appuyez sur Entrée</span>
          </div> : <>
            <div className="word-stage">
              <span className="eyebrow">{scriptLabels[word.script]}</span>
              <h1 id="kana-word" className="kana-word" lang="ja" style={{ fontSize: `clamp(1.6rem, ${84 / [...word.kana].length}vw, ${Math.min(112, 650 / [...word.kana].length)}px)` }}>{word.kana}</h1>
            </div>

            <div className="answer-mode-selector" aria-label="Façon de répondre">
              <button aria-pressed={!oral} onClick={() => dispatch({ type: 'answer-mode', mode: 'keyboard' })}>Clavier</button>
              <button ref={speechModeRef} aria-pressed={oral} onClick={() => dispatch({ type: 'answer-mode', mode: 'speech' })}>À voix haute</button>
            </div>
            <form className={`answer-form ${oral ? 'oral-form' : ''} ${state.feedback === 'error' ? 'has-error' : ''} ${state.feedback === 'success' ? 'has-success' : ''}`} onSubmit={(event) => {
              event.preventDefault()
              if (!composing.current) dispatch({ type: 'submit', now: Date.now() })
            }}>
              {oral ? state.revealed ? <button ref={speechButtonRef} className="primary-button" type="submit">Continuer <EnterIcon/></button>
                : <SpeechAnswer key={state.round} word={word} enabled={!settingsOpen} buttonRef={speechButtonRef} onRecognized={recognize} success={successNotice}/>
                : <div className="input-row">
                <label className="sr-only" htmlFor="romaji">Romanisation du mot affiché</label>
                <input ref={inputRef} id="romaji" name="romaji" autoFocus autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="text" enterKeyHint="go" maxLength={80} placeholder={state.revealed ? 'Entrée pour continuer' : 'Votre lecture en rōmaji'} value={compositionDraft ?? state.input} readOnly={state.revealed} aria-describedby="answer-feedback" aria-invalid={state.feedback === 'error'} onChange={(event) => {
                  if (composing.current) { setCompositionDraft(event.target.value); return }
                  if (composedValue.current === event.target.value) { composedValue.current = null; return }
                  composedValue.current = null
                  dispatch({ type: 'type', value: event.target.value, now: Date.now() })
                }} onCompositionStart={() => { composing.current = true; setCompositionDraft(state.input) }} onCompositionEnd={(event) => {
                  composing.current = false
                  composedValue.current = event.currentTarget.value
                  setCompositionDraft(null)
                  dispatch({ type: 'type', value: event.currentTarget.value, now: Date.now() })
                }} onKeyDown={(event) => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.repeat)) event.preventDefault() }} />
                <button className="submit-button" type="submit" aria-label={state.revealed ? 'Mot suivant' : 'Valider la lecture'} title="Entrée"><EnterIcon/></button>
              </div>}
              {(!oral || state.revealed) && <div id="answer-feedback" className="answer-feedback" role="status" aria-live="polite" aria-atomic="true">
                {state.revealed ? <div className="revealed-answer"><strong>{word.romaji[0]}</strong><span>{word.meaning}</span></div>
                  : state.feedback === 'success' ? successNotice
                  : feedback ? <span className="error-feedback">{feedback}</span> : <span className="input-hint">La bonne lecture passe au mot suivant.</span>}
              </div>}
              <button type="button" className="skip-button" onClick={() => { dispatch({ type: 'reveal', now: Date.now() }); focusAnswer() }}>{state.revealed ? 'Mot suivant' : 'Je ne sais pas'}<span aria-hidden="true">{state.revealed ? '↵' : '↗'}</span></button>
            </form>
            <div className="exercise-meta">
              {settings.difficulty !== 'all' && <button onClick={() => setSettingsOpen(true)} disabled={running}>{difficultyLabels[settings.difficulty]}</button>}
              {stats.errors > 0 && <span>{stats.errors} {stats.errors > 1 ? 'mots à revoir' : 'mot à revoir'}</span>}
            </div>
          </>}
      </section>
    </main>

    <footer className="site-footer"><div className="keyboard-hints"><span><kbd>↵</kbd> {oral ? 'écouter / continuer' : 'valider'}</span><span><kbd>esc</kbd> révéler / suivant</span></div><div className="storage-status"><span>{pool.length} mots</span><span className="footer-separator" aria-hidden="true">·</span><span>{saved ? 'Enregistré sur cet appareil' : 'Progression pour cette session'}</span></div></footer>
    <SettingsDialog open={settingsOpen} settings={settings} poolSize={pool.length} totalAnswers={state.progress.answers} onChange={updateSettings} onClose={() => setSettingsOpen(false)}/>
  </div>
}
