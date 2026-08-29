import { ALL_WORDS, GENRES } from '../js/data/word-data.js';

const REQUIRED = [
  'id', 'word', 'reading', 'difficulty', 'easyMeaning', 'standardMeaning',
  'example', 'scene', 'correctUsage', 'wrongUsage', 'misconception'
];
const DIFFICULTIES = new Set(['はじめ', 'なれた', 'チャレンジ']);
const errors = [];

for (const genre of GENRES) {
  if (genre.data.length !== 40) {
    errors.push(`${genre.label}: ${genre.data.length}語（40語にしてください）`);
  }

  for (const word of genre.data) {
    for (const key of REQUIRED) {
      if (typeof word[key] !== 'string' || !word[key].trim()) {
        errors.push(`${word.id}: ${key}が空です`);
      }
    }
    if (!DIFFICULTIES.has(word.difficulty)) errors.push(`${word.id}: 難易度が不正です`);
    if (!/^[ぁ-ゖー]+$/.test(word.reading)) errors.push(`${word.id}: 読みはひらがなで入力してください`);
    if (word.correctUsage === word.wrongUsage) errors.push(`${word.id}: 正用例と誤用例が同じです`);
    if (word.genre === 'idiom' && !word.literalMeaning.trim()) errors.push(`${word.id}: 文字どおりの意味が空です`);
  }
}

const duplicateValues = (values) => values.filter((value, index) => values.indexOf(value) !== index);
for (const id of new Set(duplicateValues(ALL_WORDS.map((word) => word.id)))) errors.push(`ID重複: ${id}`);
for (const word of new Set(duplicateValues(ALL_WORDS.map((item) => item.word)))) errors.push(`見出し語重複: ${word}`);

const summary = GENRES.map((genre) => `${genre.label} ${genre.data.length}語`).join(' / ');
if (errors.length) {
  console.error(`問題データに${errors.length}件の確認事項があります。`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`問題データ確認OK: ${summary} / 合計 ${ALL_WORDS.length}語`);
}
