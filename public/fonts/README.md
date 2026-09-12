# Japanese typefaces for Kotoba

Downloaded from the Google Fonts CSS API on 2026-09-12, limited to hiragana and katakana (U+3041–3096, U+3099–309F, U+30A0–30FF), then compressed to WOFF2 with FontTools. The glyph outlines are unchanged. These files cover every kana in the current 500-word bank. Broader Japanese text, such as future kanji exercises, requires extending the font coverage.

| File | Typeface | Weight | Version | License |
| --- | --- | --- | --- | --- |
| noto-sans-jp-kana.woff2 | Noto Sans JP | 400 | 2.004 | notosansjp-OFL.txt |
| klee-one-kana.woff2 | Klee One | 600 | 1.100 | kleeone-OFL.txt |
| noto-serif-jp-kana.woff2 | Noto Serif JP | 400 | 2.003 | notoserifjp-OFL.txt |

All three fonts are distributed under the SIL Open Font License 1.1. Keep their copyright notices and license files when redistributing these assets. CSS family aliases (`Kotoba Sans`, `Kotoba Hand`, `Kotoba Serif`) only distinguish the locally hosted files from installed system fonts.

Upstream projects:

- [Noto Sans / Noto Serif CJK](https://github.com/notofonts/noto-cjk)
- [Klee One](https://github.com/fontworks-fonts/Klee)
- [Google Fonts: Noto Sans JP](https://github.com/google/fonts/tree/main/ofl/notosansjp)
- [Google Fonts: Klee One](https://github.com/google/fonts/tree/main/ofl/kleeone)
- [Google Fonts: Noto Serif JP](https://github.com/google/fonts/tree/main/ofl/notoserifjp)

The running application loads these local files; it does not call the Google Fonts API.
