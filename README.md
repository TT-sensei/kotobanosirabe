# ことばのしるべ

ことわざ・慣用句・四字熟語の「意味」と「使う場面」を学ぶ、小学校中学年〜高学年向けの学習アプリです。

## 学習の流れ

ことばを知る → 意味が分かる → 場面とつながる → 自分で使える、を大切にしています。

- ことばを知る：読み、やさしい意味、例文、使う場面、ひとこと解説を確認
- 意味クイズ：意味を3択から選ぶ
- 場面クイズ：短い場面に合うことばを選ぶ
- 使い方クイズ：正しく使われた文を選ぶ
- 慣用句専用：文字どおりの意味と慣用的な意味を比べる
- もういちど：間違えたことばを、意味→場面の別角度で復習
- わたしのことば帳：学んだことばをカードで見返す

## データの追加・修正

問題データは [`js/data/word-data.js`](./js/data/word-data.js) に集約しています。現在は、ことわざ40語・慣用句40語・四字熟語40語の合計120語です。1語分のデータを配列へ追加すると、カード・意味クイズ・場面クイズ・使い方クイズへ自動反映されます。

意味・場面・例文などの必須項目と語数は、`node scripts/check-word-data.mjs` で確認できます。追加方法と確認観点は [`DATA-GUIDE.md`](./DATA-GUIDE.md) にまとめています。

## edu-kit

edu-kitの方針に沿い、HTML / CSS / Vanilla JavaScript、GitHub Pages、教材固有namespaceの `StorageManager` を使用しています。

- `edu-components`：`ScreenManager`、`QuestionPool`、`ChoiceQuestion`、`AnswerChecker`、`ScoreManager`、`ComboManager`、`ProgressManager`、`StorageManager`、`BadgeManager`
- `edu-effects`：学習画面と正誤フィードバックのCSS、`effect-correct-pop`、`effect-wrong-shake`
- `sounds-recipe-`：`correct`、`softFail`、`hint`、`combo3`、`badge`
- `navi-character-`：日常の学習集合画像、正誤・ヒント・達成時の軽量WebP
- `edu-assets`：理解した語数の節目に獲得する日本語バッジ

外部API、ログイン、データベース、ビルド環境は使いません。学習記録はブラウザのlocalStorageへ保存します。

## 利用について

学校・家庭での学習目的で無料で利用できます。

このリポジトリのコードやオリジナル教材を、許可なく有料教材・有料サービス・販売商品として利用することはできません。問題データ、解説、例文、キャラクター等をまとめて再配布・販売することも許可していません。

外部ライブラリ、フォント、画像、音源、その他の第三者素材には、それぞれの権利者・ライセンスの条件が適用されます。

## License

Software code and original educational content in this repository are licensed under the PolyForm Noncommercial License 1.0.0.

https://polyformproject.org/licenses/noncommercial/1.0.0/

Copyright © 2026 TT-sensei.
