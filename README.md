# Kotoba — Lecture, mot à mot

Une petite application web pour lire des mots entiers en hiragana et katakana, utilisable en local ou sur Vercel. React, TypeScript et Vite ; CSS simple, sans bibliothèque d’interface. Les deux seules dépendances exécutées par l’application sont React et React DOM.

## Lancer l’application

Prérequis : **Node.js 22.12 ou plus récent** (Node 24 conseillé).

```sh
npm install
npm run dev
```

Ouvrir l’adresse locale affichée dans le terminal (normalement **http://127.0.0.1:5173/**). Le serveur écoute uniquement sur l’ordinateur local. Garder le terminal ouvert pendant l’utilisation. `Ctrl+C` arrête le serveur.

```sh
npm test         # Tests avec le moteur intégré de Node, sans dépendance de test
npm run build   # Vérification TypeScript et génération dans dist/
npm run preview # Servir la version compilée localement
```

## Déployer sur Vercel

Le fichier `vercel.json` configure Vite, la compilation `npm run build` et le dossier publié `dist`. Importer le dépôt GitHub dans Vercel, ou lier le dossier avec `vercel link`, puis lancer `vercel --prod`. Aucune variable d’environnement n’est nécessaire. Quand le dépôt est connecté à Vercel, les pushes sur la branche de production déclenchent un nouveau déploiement.

La progression enregistrée en local ne migre pas automatiquement vers l’adresse Vercel : chaque adresse conserve sa propre sauvegarde dans le navigateur. L’application publiée reste utilisable sans compte.

## Utilisation

- Commencer à taper immédiatement. La bonne lecture affiche le mot suivant et garde le focus.
- Une saisie encore incomplète reste neutre. Une lecture erronée est signalée sans donner la solution.
- **Entrée** : valider une tentative, ou continuer après une révélation.
- **Échap** : révéler la lecture et son sens ; une seconde pression passe au mot suivant.
- **Tab / Maj+Tab** : parcourir les commandes. Échap ferme les paramètres et rend le focus à la réponse.
- **Hiragana / Katakana / Mixte** : choisir le syllabaire. Le mode mixte est sélectionné par défaut et équilibre les deux écritures quand les filtres le permettent.
- **Paramètres** : police des caractères japonais, difficulté, longueur et traduction après réussite. La traduction est désactivée par défaut et n’apparaît jamais avant une réponse, sauf demande explicite avec « Je ne sais pas ».
- **60 secondes** : Entrée sur « Démarrer » lance le chrono. Un retour à « Libre » quitte le chrono. Le bilan affiche les mots parcourus (réponses trouvées ou révélées), les bonnes réponses, les mots avec erreur et les mots correctement lus par minute.

Le thème suit `prefers-color-scheme` : clair par défaut, sombre si le système le demande. La page s’adapte au mobile ; les animations sont désactivées avec `prefers-reduced-motion`.

### Choisir le tracé des caractères

Dans **Paramètres → Écriture japonaise**, comparer trois polices sur les mêmes hiragana et katakana : **Simple** (Noto Sans JP, par défaut), **Manuscrite** (Klee One) et **Livre** (Noto Serif JP). Le choix s’applique immédiatement au mot, aux retours en japonais et aux exemples d’aide, sans changer le mot ni effacer une réponse commencée. Il est mémorisé sur cet appareil. Les sauvegardes précédentes conservent leur progression et adoptent la police Simple.

Les trois polices sont livrées avec l’application, sans requête à Google Fonts pendant l’utilisation. Les fichiers WOFF2 couvrent les kana de toute la banque ; leurs licences et sources se trouvent dans `public/fonts/`. Aucun kanji n’est inclus dans ces fichiers limités aux kana.

## Lecture à voix haute (facultative)

Le **clavier reste le mode par défaut à chaque ouverture**. Choisir **À voix haute**, puis **Activer le micro** (ou Entrée lorsque ce bouton a le focus). Autoriser le micro dans le navigateur, attendre « À vous », et prononcer le mot en japonais. Une lecture reconnue passe au mot suivant ; relancer le micro pour ce nouveau mot. Revenir à **Clavier** conserve une saisie commencée sur le même mot.

Une transcription différente ou une confiance trop faible invite à réessayer **sans erreur ni pénalité**. « Je ne sais pas » garde son comportement habituel : révélation et mot à revoir. Le mode oral partage la progression et fonctionne aussi avec le chrono.

L’écoute s’arrête après un résultat, après 15 secondes au maximum, à l’annulation, au changement de mot ou de mode, à l’ouverture des paramètres et lorsque la page passe en arrière-plan. Elle ne redémarre jamais automatiquement. La lecture audio de démonstration a été retirée.

Cette fonction utilise la reconnaissance japonaise du navigateur (`SpeechRecognition` / `webkitSpeechRecognition`, `ja-JP`). Sa disponibilité et celle du service varient selon le navigateur : essayer Chrome ou Safari si le navigateur intégré ne la propose pas. Le navigateur peut envoyer la voix à son service de reconnaissance ; **une connexion peut donc être nécessaire**, même si l’application est locale. L’application ne stocke ni enregistrement ni transcription et n’a aucune clé d’API. Voir la [documentation de la reconnaissance vocale](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

Il s’agit d’un exercice de lecture, pas d’une évaluation précise de l’accent ou de la hauteur des sons. Le moteur peut deviner un mot malgré une prononciation imparfaite. `src/data/spokenForms.ts` reconnaît les écritures courantes renvoyées en kanji (par exemple `卵` pour `たまご`) ainsi que des homophones ; l’exercice et le retour affiché restent en kana. Une écriture non prévue demande simplement une nouvelle tentative.

## Lectures acceptées

La banque utilise principalement Hepburn. Les variantes sont calculées à partir des syllabes pour distinguer les combinaisons étrangères : `ティ` accepte `ti`, sans être confondu avec `チ` (`chi` / `ti`).

| Kana | Exemples de saisie |
| --- | --- |
| すし | `sushi`, `susi` |
| しゃしん | `shashin`, `syasin` |
| ちょっと | `chotto`, `tyotto` |
| がっこう | `gakkou`, `gakkoo`, `gakkō` |
| コーヒー | `koohii`, `kōhī` |
| ほんや | `honya`, `hon'ya`, `honnya` |
| てんぷら | `tenpura`, `tempura` |
| サンドイッチ | `sandoicchi`, `sandoitchi` |

Majuscules, lettres latines pleine chasse et apostrophes typographiques sont normalisées. Les macrons et accents circonflexes de voyelles longues sont facultatifs. Les consonnes doubles et longueurs de voyelles restent nécessaires : `kohi` n’est pas accepté pour `コーヒー`.

Les variantes `ou` / `oo` et `ei` / `ee` sont renseignées **mot par mot**. On ne transforme pas systématiquement une suite de voyelles : `おもう` conserve `omou`. Les salutations `こんにちは` et `こんばんは` acceptent leurs lectures habituelles en `wa` ainsi que la translittération littérale en `ha`.

## Banque de mots

`src/data/words.ts` contient **700 mots distincts : 400 en hiragana, 300 en katakana**. Chaque ligne associe kana, lectures et sens français. L’export `words` fournit des objets `{ kana, romaji: string[], meaning, script, features }`.

Les mots ont été sélectionnés et les traductions courtes rédigées pour cette application : alimentation, animaux, nature, saisons, sensations, personnes, corps, lieux, déplacements, objets, temps, actions, études, travail, adjectifs, services et emprunts du quotidien. Les mots habituellement écrits en kanji sont présentés en hiragana. Aucun exercice ne contient de kanji. Les verbes sont à la forme dictionnaire ; quelques noms d’action et expressions courantes complètent la liste.

Les tests contrôlent toute la banque : effectif, écritures, doublons, structure, lectures principales et cas particuliers. Ils vérifient la cohérence de transcription ; ils ne remplacent pas une relecture lexicographique humaine.

Repères pédagogiques consultés : [Irodori, ressources de la Japan Foundation](https://www.irodori.jpf.go.jp/en/resources.html) et [leçon 2, katakana et prononciation](https://www.irodori.jpf.go.jp/assets/data/starter/pdf/X_L02.pdf). L’application ne télécharge aucun contenu depuis ces sites.

Les caractéristiques sont dérivées des kana : `basic`, `dakuten`, `handakuten`, `youon`, `small-tsu`, `long-vowel`, `mixed-complexity`. Le filtre « Dakuten et handakuten » regroupe les deux. Les petits kana d’emprunts (ファ, ティ…) sont classés en difficultés combinées. Les longueurs comptent les caractères kana visibles, **y compris** les petits kana et le signe `ー` : court = 2–3, moyen = 4–5, long = 6 et plus.

## Répétition et sauvegarde

Une apparition d’un mot peut compter **au plus une erreur**, même après plusieurs essais. Révéler un mot compte comme une erreur et une réponse parcourue, sans augmenter les bonnes réponses. Une correction réussie reste une bonne réponse, mais ne supprime pas l’erreur initiale.

Les mots sont mélangés en cycles sans remise : chaque mot du pool sélectionné apparaît une fois avant qu’un nouveau mélange commence. Le tirage est enregistré avec la progression afin de continuer la rotation après fermeture ou rechargement du navigateur. Les erreurs ne changent pas l’ordre ni la fréquence de retour des mots. En mode mixte, les deux syllabaires sont alternés autant que le permet leur effectif.

La clé `kana-lecture:v1` de `localStorage` conserve les paramètres, la progression, les erreurs/réussites par mot et la position dans le cycle de tirage. La migration des anciennes sauvegardes élargit le filtre par défaut au mode mixte et désactive la traduction après réussite. Les compteurs affichés sur l’écran de lecture concernent la session ; le total enregistré est visible dans les paramètres. Le chronomètre n’est pas repris après un rechargement.

La progression reste dans le navigateur utilisé et dépend de l’adresse **et du port** : `localhost` et `127.0.0.1` ont des sauvegardes distinctes. Un stockage bloqué ou endommagé ne bloque pas les exercices ; le bas de page indique alors que la progression reste limitée à la session. Aucun compte, backend, analyseur d’usage ou base de données n’est utilisé. Seule la reconnaissance vocale facultative peut faire appel au service distant du navigateur.

## Organisation

```text
src/
  App.tsx                     écran, clavier et choix du mode de réponse
  styles.css                  styles et thèmes
  components/
    SettingsDialog.tsx        paramètres dans un dialogue natif
    SpeechAnswer.tsx          bouton micro et retours de reconnaissance
    Icons.tsx                 quatre icônes SVG
  data/
    words.ts                  banque des 700 mots
    spokenForms.ts            formes écrites pour la reconnaissance orale
  lib/
    types.ts                  types partagés
    romaji.ts                 lectures et variantes
    wordSelection.ts          filtres et cycles aléatoires sans remise
    practice.ts               logique de l’exercice et du chrono
    storage.ts                sauvegarde locale validée
    speech.ts                 correspondances entre transcriptions et mots
    speechRecognition.ts      cycle d’écoute et arrêt du micro
tests/                        tests de lecture, données, sessions, voix et sauvegarde
```

Le chrono utilise une échéance absolue de 60 secondes, vérifiée aussi au moment d’une réponse : un onglet inactif ou un rafraîchissement retardé ne donne pas de temps supplémentaire.
