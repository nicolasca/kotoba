import { useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { MicrophoneIcon } from './Icons.tsx'
import { matchingSpeech, transcriptAsKana } from '../lib/speech.ts'
import type { SpeechAlternative } from '../lib/speech.ts'
import { createSpeechSession, recognitionConstructor } from '../lib/speechRecognition.ts'
import type { SpeechIssue, SpeechStatus } from '../lib/speechRecognition.ts'
import type { Word } from '../lib/types.ts'

const messages: Record<SpeechIssue, string> = {
  unsupported: 'La reconnaissance vocale n’est pas disponible dans ce navigateur. Essayez cette adresse dans Chrome ou Safari, ou continuez au clavier.',
  permission: 'Le micro ou la reconnaissance vocale n’est pas autorisé. Vérifiez les permissions du navigateur, puis réessayez.',
  microphone: 'Aucun micro accessible. Vérifiez qu’il est connecté et disponible.',
  network: 'Le service vocal est indisponible. Vérifiez votre connexion, ou réessayez dans un autre navigateur.',
  language: 'Ce navigateur ne propose pas la reconnaissance du japonais.',
  silence: 'Aucun mot reconnu. Vous pouvez réessayer tranquillement.',
  timeout: 'L’écoute s’est arrêtée après 15 secondes. Vous pouvez réessayer.',
  unknown: 'L’écoute n’a pas pu aboutir. Réessayez, ou continuez au clavier.',
}

interface Props {
  word: Word
  enabled: boolean
  buttonRef: RefObject<HTMLButtonElement | null>
  onRecognized: (alternatives: SpeechAlternative[]) => void
  success?: ReactNode
}

export default function SpeechAnswer({ word, enabled, buttonRef, onRecognized, success }: Props) {
  const [supported] = useState(() => recognitionConstructor() !== null)
  const [status, setStatus] = useState<SpeechStatus>({ phase: 'idle' })
  const [retry, setRetry] = useState(false)
  const [heard, setHeard] = useState<string | null>(null)
  const sessionRef = useRef<ReturnType<typeof createSpeechSession> | null>(null)
  const busy = status.phase === 'starting' || status.phase === 'listening' || status.phase === 'processing'

  useEffect(() => {
    const Constructor = recognitionConstructor()
    if (!Constructor) return
    const session = createSpeechSession({
      create: () => new Constructor(),
      onStatus: setStatus,
      onResult: (alternatives) => {
        if (matchingSpeech(word, alternatives)) onRecognized(alternatives)
        else {
          setHeard(transcriptAsKana(alternatives[0]?.transcript ?? ''))
          setRetry(true)
        }
      },
    })
    sessionRef.current = session
    const stopInBackground = () => { if (document.hidden) session.cancel() }
    const stopOnPageExit = () => session.cancel()
    document.addEventListener('visibilitychange', stopInBackground)
    window.addEventListener('pagehide', stopOnPageExit)
    return () => {
      session.dispose()
      sessionRef.current = null
      document.removeEventListener('visibilitychange', stopInBackground)
      window.removeEventListener('pagehide', stopOnPageExit)
    }
  }, [word, onRecognized])

  useEffect(() => { if (!enabled) sessionRef.current?.cancel() }, [enabled])

  const label = busy ? (status.phase === 'processing' ? 'Annuler' : 'Arrêter l’écoute') : retry || status.phase === 'error' ? 'Réessayer' : 'Activer le micro'
  const message = !supported ? messages.unsupported
    : status.phase === 'error' ? messages[status.issue]
      : status.phase === 'starting' ? 'Autorisez le micro si le navigateur vous le demande…'
        : status.phase === 'listening' ? 'À vous. Lisez le mot à voix haute.'
          : status.phase === 'processing' ? 'Reconnaissance en cours…'
            : retry ? 'Lecture incertaine. Réessayez, sans pénalité.' : 'Entrée pour écouter, puis prononcez le mot.'

  return <div className="speech-answer">
    <button ref={buttonRef} type="button" className={`microphone-button ${busy ? 'is-listening' : ''}`} disabled={!supported || !enabled} aria-pressed={busy} aria-describedby={supported ? 'speech-feedback speech-notice' : 'speech-feedback'} onClick={() => {
      if (busy) sessionRef.current?.cancel()
      else { setRetry(false); setHeard(null); sessionRef.current?.start() }
    }}><MicrophoneIcon/>{label}</button>
    <div id="speech-feedback" className="speech-feedback" role="status" aria-live="polite" aria-atomic="true">
      {heard && <span className="heard-word">Entendu : <span lang="ja">{heard}</span></span>}
      {!busy && !retry && status.phase === 'idle' && supported && success ? success : <span>{message}</span>}
    </div>
    {supported && <p id="speech-notice" className="speech-notice">Votre navigateur peut traiter votre voix en ligne.<br/>L’application ne conserve aucun enregistrement audio.</p>}
  </div>
}
