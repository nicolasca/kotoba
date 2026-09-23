import type { Script, Word } from '../lib/types.ts'
import { detectFeatures } from '../lib/wordSelection.ts'

// Hand-selected everyday words. Format: kana | preferred romaji, optional aliases | French meaning.
// Alternative long vowels are explicit: we never shorten every "ou" automatically (e.g. おもう).
const hiragana = `
# Aliments — 45
たまご|tamago|œuf
ごはん|gohan|riz ; repas
おにぎり|onigiri|boulette de riz
おかゆ|okayu|bouillie de riz
おもち|omochi|gâteau de riz
すし|sushi|sushi
さしみ|sashimi|poisson cru
てんぷら|tenpura|beignet japonais
そば|soba|nouilles de sarrasin
うどん|udon|nouilles épaisses
そうめん|soumen,soomen|nouilles fines
みそ|miso|pâte de soja
しょうゆ|shouyu,shooyu|sauce soja
しお|shio|sel
さとう|satou,satoo|sucre
こしょう|koshou,koshoo|poivre
あぶら|abura|huile
おちゃ|ocha|thé
みず|mizu|eau
ぎゅうにゅう|gyuunyuu|lait
にく|niku|viande
さかな|sakana|poisson
とりにく|toriniku|poulet
ぶたにく|butaniku|porc
ぎゅうにく|gyuuniku|bœuf
やさい|yasai|légumes
くだもの|kudamono|fruit
りんご|ringo|pomme
みかん|mikan|mandarine
いちご|ichigo|fraise
ぶどう|budou,budoo|raisin
もも|momo|pêche
なし|nashi|poire
すいか|suika|pastèque
かき|kaki|kaki
たまねぎ|tamanegi|oignon
にんじん|ninjin|carotte
じゃがいも|jagaimo|pomme de terre
きゅうり|kyuuri|concombre
だいこん|daikon|radis blanc
おかし|okashi|friandise
まめ|mame|haricot
なす|nasu|aubergine
きのこ|kinoko|champignon
はちみつ|hachimitsu|miel
# Animaux — 20
いぬ|inu|chien
ねこ|neko|chat
とり|tori|oiseau
うさぎ|usagi|lapin
うま|uma|cheval
うし|ushi|vache
ぶた|buta|cochon
ひつじ|hitsuji|mouton
やぎ|yagi|chèvre
さる|saru|singe
くま|kuma|ours
きつね|kitsune|renard
たぬき|tanuki|chien viverrin
しか|shika|cerf
ねずみ|nezumi|souris
りす|risu|écureuil
かえる|kaeru|grenouille
かめ|kame|tortue
へび|hebi|serpent
むし|mushi|insecte
# Nature — 20
やま|yama|montagne
かわ|kawa|rivière
うみ|umi|mer
そら|sora|ciel
あめ|ame|pluie
ゆき|yuki|neige
かぜ|kaze|vent
くも|kumo|nuage
ほし|hoshi|étoile
つき|tsuki|lune
たいよう|taiyou,taiyoo|soleil
はな|hana|fleur
もり|mori|forêt
はやし|hayashi|bois
いけ|ike|étang
みずうみ|mizuumi|lac
いし|ishi|pierre
すな|suna|sable
つち|tsuchi|terre
はっぱ|happa|feuille
# Personnes et corps — 30
わたし|watashi|je ; moi
あなた|anata|vous ; toi
ひと|hito|personne
こども|kodomo|enfant
おとな|otona|adulte
かぞく|kazoku|famille
ちち|chichi|mon père
はは|haha|ma mère
あに|ani|mon grand frère
あね|ane|ma grande sœur
おとうと|otouto,otooto|petit frère
いもうと|imouto,imooto|petite sœur
おじいさん|ojiisan|grand-père
おばあさん|obaasan|grand-mère
ともだち|tomodachi|ami
せんせい|sensei,sensee|professeur
がくせい|gakusei,gakusee|étudiant
あかちゃん|akachan|bébé
おかあさん|okaasan|maman
おとうさん|otousan,otoosan|papa
あたま|atama|tête
かお|kao|visage
からだ|karada|corps
かみ|kami|cheveux
みみ|mimi|oreilles
くち|kuchi|bouche
おなか|onaka|ventre
あし|ashi|pied ; jambe
ゆび|yubi|doigt
こころ|kokoro|cœur ; esprit
# Lieux — 30
いえ|ie|maison
へや|heya|chambre
だいどころ|daidokoro|cuisine
おふろ|ofuro|bain
にわ|niwa|jardin
げんかん|genkan|entrée
がっこう|gakkou,gakkoo|école
だいがく|daigaku|université
としょかん|toshokan|bibliothèque
びょういん|byouin,byooin|hôpital
ぎんこう|ginkou,ginkoo|banque
ゆうびんきょく|yuubinkyoku|bureau de poste
えき|eki|gare
くうこう|kuukou,kuukoo|aéroport
みせ|mise|magasin
ほんや|honya|librairie
やおや|yaoya|marchand de légumes
くすりや|kusuriya|pharmacie
きっさてん|kissaten|salon de thé
こうえん|kouen,kooen|parc
どうぶつえん|doubutsuen,doobutsuen|zoo
はくぶつかん|hakubutsukan|musée
びじゅつかん|bijutsukan|musée d’art
えいがかん|eigakan,eegakan|cinéma
しょくどう|shokudou,shokudoo|cantine
まち|machi|ville
むら|mura|village
みち|michi|chemin
はし|hashi|pont
かいしゃ|kaisha|entreprise
# Objets — 25
つくえ|tsukue|bureau
いす|isu|chaise
ほん|hon|livre
かばん|kaban|sac
くつ|kutsu|chaussures
くつした|kutsushita|chaussettes
ふく|fuku|vêtements
ぼうし|boushi,booshi|chapeau
めがね|megane|lunettes
とけい|tokei,tokee|montre ; horloge
かさ|kasa|parapluie
かぎ|kagi|clé
さいふ|saifu|portefeuille
でんわ|denwa|téléphone
しゃしん|shashin|photo
えんぴつ|enpitsu|crayon
てがみ|tegami|lettre
しんぶん|shinbun|journal
ちず|chizu|carte géographique
はこ|hako|boîte
はさみ|hasami|ciseaux
おさら|osara|assiette
ちゃわん|chawan|bol à riz
はぶらし|haburashi|brosse à dents
せっけん|sekken|savon
# Temps — 25
きょう|kyou,kyoo|aujourd’hui
きのう|kinou,kinoo|hier
あした|ashita|demain
あさ|asa|matin
ひる|hiru|midi ; journée
よる|yoru|soir ; nuit
ゆうがた|yuugata|fin d’après-midi
あさって|asatte|après-demain
おととい|ototoi|avant-hier
まいにち|mainichi|chaque jour
まいあさ|maiasa|chaque matin
まいばん|maiban|chaque soir
いま|ima|maintenant
あと|ato|après
まえ|mae|avant ; devant
じかん|jikan|temps ; heure
しゅうまつ|shuumatsu|week-end
げつようび|getsuyoubi,getsuyoobi|lundi
かようび|kayoubi,kayoobi|mardi
すいようび|suiyoubi,suiyoobi|mercredi
もくようび|mokuyoubi,mokuyoobi|jeudi
きんようび|kinyoubi,kinyoobi|vendredi
どようび|doyoubi,doyoobi|samedi
にちようび|nichiyoubi,nichiyoobi|dimanche
やすみ|yasumi|repos ; congé
# Actions — 60
たべる|taberu|manger
のむ|nomu|boire
みる|miru|voir
きく|kiku|écouter
はなす|hanasu|parler
よむ|yomu|lire
かく|kaku|écrire
あるく|aruku|marcher
はしる|hashiru|courir
およぐ|oyogu|nager
いく|iku|aller
くる|kuru|venir
つづく|tsuzuku|continuer
はいる|hairu|entrer
でる|deru|sortir
おきる|okiru|se lever
ねる|neru|dormir
やすむ|yasumu|se reposer
はたらく|hataraku|travailler
あそぶ|asobu|jouer
まなぶ|manabu|apprendre
おしえる|oshieru|enseigner
ならう|narau|apprendre auprès de quelqu’un
べんきょう|benkyou,benkyoo|étude
かう|kau|acheter
うる|uru|vendre
つかう|tsukau|utiliser
つくる|tsukuru|fabriquer
あける|akeru|ouvrir
しめる|shimeru|fermer
つける|tsukeru|allumer
けす|kesu|éteindre
まつ|matsu|attendre
もつ|motsu|tenir
とる|toru|prendre
おく|oku|poser
あらう|arau|laver
きる|kiru|porter un vêtement
ぬぐ|nugu|enlever un vêtement
わらう|warau|rire
なく|naku|pleurer
おもう|omou|penser
しる|shiru|savoir
わかる|wakaru|comprendre
わすれる|wasureru|oublier
おぼえる|oboeru|mémoriser
かんがえる|kangaeru|réfléchir
あう|au|rencontrer
すわる|suwaru|s’asseoir
たつ|tatsu|se lever ; être debout
のる|noru|monter à bord
おりる|oriru|descendre
あげる|ageru|donner
もらう|morau|recevoir
かす|kasu|prêter
かりる|kariru|emprunter
てつだう|tetsudau|aider
はじめる|hajimeru|commencer
おわる|owaru|finir
いそぐ|isogu|se dépêcher
# Adjectifs — 30
おおきい|ookii|grand
ちいさい|chiisai|petit
あたらしい|atarashii|nouveau
ふるい|furui|ancien
いい|ii|bon
わるい|warui|mauvais
あつい|atsui|chaud
さむい|samui|froid (temps)
つめたい|tsumetai|froid (au toucher)
あたたかい|atatakai|chaud ; doux
すずしい|suzushii|frais
たかい|takai|haut ; cher
やすい|yasui|bon marché
ながい|nagai|long
みじかい|mijikai|court
おもい|omoi|lourd
かるい|karui|léger
おいしい|oishii|délicieux
まずい|mazui|mauvais au goût
あまい|amai|sucré
からい|karai|épicé
しょっぱい|shoppai|salé
すっぱい|suppai|acide
たのしい|tanoshii|amusant
うれしい|ureshii|heureux
かなしい|kanashii|triste
いそがしい|isogashii|occupé
むずかしい|muzukashii|difficile
やさしい|yasashii|facile ; gentil
おもしろい|omoshiroi|intéressant
# Quotidien — 15
ありがとう|arigatou,arigatoo|merci
こんにちは|konnichiwa,konnichiha|bonjour
こんばんは|konbanwa,konbanha|bonsoir
さようなら|sayounara,sayoonara|au revoir
すみません|sumimasen|excusez-moi
おはよう|ohayou,ohayoo|bonjour (matin)
おやすみ|oyasumi|bonne nuit
どうぞ|douzo,doozo|je vous en prie
どうも|doumo,doomo|merci ; salut
ゆっくり|yukkuri|lentement
ちょっと|chotto|un peu
いっしょ|issho|ensemble
だいじょうぶ|daijoubu,daijoobu|ça va ; sans problème
ほんとう|hontou,hontoo|vérité ; vraiment
りょうり|ryouri,ryoori|cuisine (préparation)
# Sensations, saisons et déplacements — 50
おと|oto|son
こえ|koe|voix
におい|nioi|odeur
あじ|aji|goût ; saveur
いろ|iro|couleur
あか|aka|rouge
あお|ao|bleu
しろ|shiro|blanc
くろ|kuro|noir
きいろ|kiiro|jaune
ちゃいろ|chairo|marron
むらさき|murasaki|violet
みどり|midori|vert
はる|haru|printemps
なつ|natsu|été
あき|aki|automne
ふゆ|fuyu|hiver
くび|kubi|cou
かた|kata|épaule
て|te|main
ひじ|hiji|coude
ひざ|hiza|genou
つめ|tsume|ongle
まど|mado|fenêtre
かべ|kabe|mur
ゆか|yuka|sol ; plancher
かいだん|kaidan|escalier
ちか|chika|sous-sol
でんしゃ|densha|train
ちかてつ|chikatetsu|métro
じてんしゃ|jitensha|vélo
じどうしゃ|jidousha|voiture
ひこうき|hikouki|avion
ふね|fune|bateau
こうさてん|kousaten|carrefour
しんごう|shingou|feu de circulation
ちゅうしゃじょう|chuushajou|parking
たいふう|taifuu|typhon
じしん|jishin|tremblement de terre
かみなり|kaminari|tonnerre
にじ|niji|arc-en-ciel
はこぶ|hakobu|transporter
さがす|sagasu|chercher
みつける|mitsukeru|trouver
ひろう|hirou|ramasser
すてる|suteru|jeter
ならぶ|narabu|faire la queue
まがる|magaru|tourner
わたる|wataru|traverser
もどる|modoru|revenir
# Études, travail et services — 50
たてもの|tatemono|bâtiment
しょうてんがい|shoutengai,shootengai|rue commerçante
ひろば|hiroba|place ; espace ouvert
こうじょう|koujou,koojou|usine
しょくば|shokuba|lieu de travail
てんいん|tenin|vendeur ; employé de magasin
てんちょう|tenchou,tenchoo|responsable de magasin
きゃく|kyaku|client ; invité
しんせき|shinseki|membre de la famille
りょうしん|ryoushin,ryooshin|parents
きょうだい|kyoudai,kyoodai|frères et sœurs
となり|tonari|voisin ; à côté
しゅくだい|shukudai|devoirs
じゅぎょう|jugyou,jugyoo|cours
しけん|shiken|examen
もんだい|mondai|question ; problème
こたえ|kotae|réponse
しつもん|shitsumon|question
せつめい|setsumei|explication
れんしゅう|renshuu|entraînement
もくひょう|mokuhyou,mokuhyoo|objectif
しゅうかん|shuukan|habitude
しごと|shigoto|travail
きゅうりょう|kyuuryou,kyuuryoo|salaire
かいぎ|kaigi|réunion
ふうとう|fuutou,fuutoo|enveloppe
きって|kitte|timbre
はがき|hagaki|carte postale
こづつみ|kozutsumi|colis
はいたつ|haitatsu|livraison
りょうきん|ryoukin|tarif ; frais
ねだん|nedan|prix
げんきん|genkin|espèces
おつり|otsuri|monnaie rendue
ぶんぼうぐ|bunbougu|fournitures de bureau
きゅうけい|kyuukei|pause
うけつけ|uketsuke|accueil ; réception
じゅんび|junbi|préparation
よてい|yotei|programme ; projet
そうだん|soudan,soodan|discussion ; conseil
しゅうり|shuuri|réparation
せんたく|sentaku|lessive
そうじ|souji|ménage
かいもの|kaimono|courses
あんない|annai|indication ; visite guidée
しゅっぱつ|shuppatsu|départ
とうちゃく|touchaku|arrivée
まちあわせ|machiawase|rendez-vous
ひっこし|hikkoshi|déménagement
しょくりょう|shokuryou,shokuryoo|denrées alimentaires
`

const katakana = `
# Aliments — 50
コーヒー|koohii|café
ティー|tii|thé
ミルク|miruku|lait
ジュース|juusu|jus
コーラ|koora|cola
サイダー|saidaa|limonade
ビール|biiru|bière
ワイン|wain|vin
スープ|suupu|soupe
パン|pan|pain
トースト|toosuto|pain grillé
サンドイッチ|sandoicchi,sandoitchi|sandwich
ハンバーガー|hanbaagaa|hamburger
ホットドッグ|hottodoggu|hot-dog
ピザ|piza|pizza
パスタ|pasuta|pâtes
スパゲッティ|supagetti|spaghettis
カレー|karee|curry
シチュー|shichuu|ragoût
グラタン|guratan|gratin
ドリア|doria|gratin de riz
オムライス|omuraisu|omelette au riz
チャーハン|chaahan|riz sauté
ラーメン|raamen|ramen
サラダ|sarada|salade
ソース|soosu|sauce
ケチャップ|kechappu|ketchup
マヨネーズ|mayoneezu|mayonnaise
ドレッシング|doresshingu|vinaigrette
チーズ|chiizu|fromage
バター|bataa|beurre
ヨーグルト|yooguruto|yaourt
クリーム|kuriimu|crème
アイスクリーム|aisukuriimu|glace
ケーキ|keeki|gâteau
クッキー|kukkii|biscuit
チョコレート|chokoreeto|chocolat
プリン|purin|flan
ゼリー|zerii|gelée sucrée
ドーナツ|doonatsu|beignet
ポテト|poteto|pomme de terre ; frites
ハム|hamu|jambon
ソーセージ|sooseeji|saucisse
ベーコン|beekon|bacon
ステーキ|suteeki|steak
バナナ|banana|banane
レモン|remon|citron
オレンジ|orenji|orange
メロン|meron|melon
パイナップル|painappuru|ananas
# Maison — 35
テーブル|teeburu|table
ソファ|sofa|canapé
ベッド|beddo|lit
カーテン|kaaten|rideau
ドア|doa|porte
ガラス|garasu|verre (matière)
ベランダ|beranda|balcon
エアコン|eakon|climatisation
ストーブ|sutoobu|poêle de chauffage
ヒーター|hiitaa|radiateur
ライト|raito|lumière ; éclairage
ランプ|ranpu|lampe
リモコン|rimokon|télécommande
テレビ|terebi|télévision
ラジオ|rajio|radio
カメラ|kamera|appareil photo
ビデオ|bideo|vidéo
コップ|koppu|verre à boire
カップ|kappu|tasse
グラス|gurasu|verre à pied
スプーン|supuun|cuillère
フォーク|fooku|fourchette
ナイフ|naifu|couteau
フライパン|furaipan|poêle à frire
オーブン|oobun|four
タオル|taoru|serviette
ハンカチ|hankachi|mouchoir
ティッシュ|tisshu|mouchoir en papier
トイレットペーパー|toirettopeepaa|papier toilette
シャンプー|shanpuu|shampooing
リンス|rinsu|après-shampooing
ブラシ|burashi|brosse
バケツ|baketsu|seau
ダンボール|danbooru|carton
スリッパ|surippa|chaussons
# Objets et numérique — 25
パソコン|pasokon|ordinateur
スマートフォン|sumaatofon|smartphone
タブレット|taburetto|tablette
キーボード|kiiboodo|clavier
マウス|mausu|souris informatique
モニター|monitaa|écran
プリンター|purintaa|imprimante
スピーカー|supiikaa|haut-parleur
イヤホン|iyahon|écouteurs
ヘッドホン|heddohon|casque audio
マイク|maiku|microphone
ケーブル|keeburu|câble
カレンダー|karendaa|calendrier
ノート|nooto|cahier
ペン|pen|stylo
ボールペン|boorupen|stylo à bille
インターネット|intaanetto|Internet
メール|meeru|courriel
アプリ|apuri|application
パスワード|pasuwaado|mot de passe
ファイル|fairu|fichier
フォルダー|forudaa|dossier
ダウンロード|daunroodo|téléchargement
クリック|kurikku|clic
コピー|kopii|copie
# Lieux et déplacements — 30
ホテル|hoteru|hôtel
レストラン|resutoran|restaurant
カフェ|kafe|café (lieu)
スーパー|suupaa|supermarché
コンビニ|konbini|supérette
デパート|depaato|grand magasin
アパート|apaato|appartement
マンション|manshon|immeuble d’habitation
オフィス|ofisu|bureau (lieu)
ビル|biru|immeuble
エレベーター|erebeetaa|ascenseur
エスカレーター|esukareetaa|escalier mécanique
トイレ|toire|toilettes
ロビー|robii|hall
フロント|furonto|réception
プール|puuru|piscine
ガソリンスタンド|gasorinsutando|station-service
バス|basu|bus
タクシー|takushii|taxi
トラック|torakku|camion
バイク|baiku|moto
スクーター|sukuutaa|scooter
ヘリコプター|herikoputaa|hélicoptère
ホーム|hoomu|quai
トンネル|tonneru|tunnel
チケット|chiketto|billet
パスポート|pasupooto|passeport
ビザ|biza|visa
スーツケース|suutsukeesu|valise
エンジン|enjin|moteur
# Loisirs — 30
スポーツ|supootsu|sport
サッカー|sakkaa|football
テニス|tenisu|tennis
バスケットボール|basukettobooru|basket-ball
バレーボール|bareebooru|volley-ball
ゴルフ|gorufu|golf
ラグビー|ragubii|rugby
スキー|sukii|ski
スケート|sukeeto|patinage
ジョギング|jogingu|jogging
マラソン|marason|marathon
サイクリング|saikuringu|cyclisme
キャンプ|kyanpu|camping
ハイキング|haikingu|randonnée
ピクニック|pikunikku|pique-nique
ダンス|dansu|danse
ヨガ|yoga|yoga
ゲーム|geemu|jeu
アニメ|anime|dessin animé japonais
ドラマ|dorama|série télévisée
ニュース|nyuusu|actualités
クイズ|kuizu|quiz
コンサート|konsaato|concert
ギター|gitaa|guitare
ピアノ|piano|piano
ドラム|doramu|batterie (instrument)
バイオリン|baiorin|violon
カラオケ|karaoke|karaoké
パーティー|paatii|fête
アルバム|arubamu|album
# Vêtements et quotidien — 30
シャツ|shatsu|chemise
セーター|seetaa|pull
コート|kooto|manteau
ジャケット|jaketto|veste
ズボン|zubon|pantalon
ジーンズ|jiinzu|jean
スカート|sukaato|jupe
ワンピース|wanpiisu|robe
スーツ|suutsu|costume
ネクタイ|nekutai|cravate
マフラー|mafuraa|écharpe
パジャマ|pajama|pyjama
サンダル|sandaru|sandales
ブーツ|buutsu|bottes
スニーカー|suniikaa|baskets
ベルト|beruto|ceinture
ポケット|poketto|poche
ボタン|botan|bouton
ファスナー|fasunaa|fermeture éclair
バッグ|baggu|sac
リュック|ryukku|sac à dos
アクセサリー|akusesarii|bijou ; accessoire
ネックレス|nekkuresu|collier
イヤリング|iyaringu|boucles d’oreilles
プレゼント|purezento|cadeau
ペット|petto|animal de compagnie
ルール|ruuru|règle
マナー|manaa|bonnes manières
チャンス|chansu|occasion ; chance
アイデア|aidea|idée
# Services, achats et santé — 50
メニュー|menyuu|menu
サービス|saabisu|service
システム|shisutemu|système
データ|deeta|données
サイズ|saizu|taille
カラー|karaa|couleur
モデル|moderu|modèle
デザイン|dezain|design
ブランド|burando|marque
セール|seeru|soldes
レジ|reji|caisse
レシート|reshiito|ticket de caisse
ポイント|pointo|points de fidélité ; point
クーポン|kuupon|coupon de réduction
キャッシュレス|kyasshuresu|sans espèces
クレジット|kurejitto|crédit
カード|kaado|carte
サイン|sain|signature
キャンセル|kyanseru|annulation
アレルギー|arerugii|allergie
ウイルス|uirusu|virus
ストレス|sutoressu|stress
カロリー|karorii|calorie
エネルギー|enerugii|énergie
マスク|masuku|masque
リラックス|rirakkusu|se détendre
トレーニング|toreeningu|entraînement
レッスン|ressun|cours ; leçon
レベル|reberu|niveau
テスト|tesuto|test
チェック|chekku|vérification
センター|sentaa|centre
アドレス|adoresu|adresse
メンバー|menbaa|membre
イベント|ibento|événement
フォーム|foomu|formulaire
キャンペーン|kyanpeen|campagne promotionnelle
アンケート|ankeeto|questionnaire
ページ|peeji|page
パッケージ|pakkeeji|emballage
イメージ|imeeji|image ; impression
バランス|baransu|équilibre
チーム|chiimu|équipe
プラン|puran|plan
サポート|sapooto|assistance
アドバイス|adobaisu|conseil
ルート|ruuto|itinéraire
コース|koosu|parcours ; menu
スケジュール|sukejuuru|planning
ユーザー|yuuzaa|utilisateur
# Pays, repas et communication — 50
フランス|furansu|France
イタリア|itaria|Italie
スペイン|supein|Espagne
ドイツ|doitsu|Allemagne
イギリス|igirisu|Royaume-Uni
アメリカ|amerika|États-Unis
カナダ|kanada|Canada
オーストラリア|oosutoraria|Australie
アジア|ajia|Asie
ヨーロッパ|yooroppa|Europe
メートル|meetoru|mètre
タイミング|taimingu|moment ; timing
チャンネル|channeru|chaîne
ライブ|raibu|concert ; direct
ランチ|ranchi|déjeuner
ディナー|dinaa|dîner
デザート|dezaato|dessert
ビュッフェ|byuffe|buffet
テイクアウト|teikuauto|à emporter
デリバリー|deribarii|livraison
アイスティー|aisutii|thé glacé
ココア|kokoa|cacao ; chocolat chaud
シリアル|shiriaru|céréales
オリーブ|oriibu|olive
アボカド|abokado|avocat
スパイス|supaisu|épice
フルーツ|furuutsu|fruits
スムージー|sumuujii|smoothie
サプリメント|sapurimento|complément alimentaire
ドリンク|dorinku|boisson
レシピ|reshipi|recette
アクセント|akusento|accent
インタビュー|intabyuu|entretien ; interview
スピーチ|supiichi|discours
タイトル|taitoru|titre
テーマ|teema|thème
キーワード|kiiwaado|mot-clé
インフォメーション|infomeeshon|renseignements
マップ|mappu|plan ; carte
エリア|eria|zone
スペース|supeesu|espace
フロア|furoa|étage
オーナー|oonaa|propriétaire
スタッフ|sutaffu|personnel
マネージャー|maneejaa|responsable ; manager
キャリア|kyaria|carrière
プロジェクト|purojekuto|projet
ミーティング|miitingu|réunion
プレゼン|purezen|présentation
アイコン|aikon|icône
`

function parseWords(rows: string, script: Script): Word[] {
  return rows.trim().split('\n').filter((row) => !row.startsWith('#')).map((row) => {
    const [kana, readings, meaning] = row.split('|')
    const romaji = readings.split(',')
    return { kana, romaji, meaning, script, features: detectFeatures(kana, romaji[0]) }
  })
}

export const words: Word[] = [...parseWords(hiragana, 'hiragana'), ...parseWords(katakana, 'katakana')]
