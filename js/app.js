import {
  EDU_EVENTS,
  ScreenManager,
  QuestionPool,
  ChoiceQuestion,
  AnswerChecker,
  ScoreManager,
  ComboManager,
  StorageManager,
  ProgressManager,
  BadgeManager
} from 'https://tt-sensei.github.io/edu-components/index.js';
import { soundList } from 'https://tt-sensei.github.io/sounds-recipe-/sounds.js';
import { ALL_WORDS, GENRES, DIFFICULTIES } from './data/word-data.js';

const ROUND_SIZE = 10;
const LEARN_SIZE = 5;
const STORAGE_KEY = 'learning-state';
const NAVI_ROOT = 'https://tt-sensei.github.io/navi-character-/assets/web/characters/';
const BADGE_ROOT = 'https://tt-sensei.github.io/edu-assets/assets/web/badges/';

const MODE_DEFS = {
  meaning: {label:'意味クイズ', title:'ことばの意味を選ぼう', icon:'？', description:'ことばの意味を、やさしい説明から選びます。', key:'meaning'},
  scene: {label:'場面クイズ', title:'場面に合うことばを選ぼう', icon:'場', description:'短い場面を読んで、ぴったりのことばを選びます。', key:'scene'},
  usage: {label:'使い方クイズ', title:'正しい使い方を選ぼう', icon:'使', description:'そのことばが自然に使われている文を選びます。', key:'usage'},
  literal: {label:'そのまま？意味？', title:'文字どおり？ 慣用的な意味？', icon:'比', description:'慣用句の二つの意味を比べます。', key:'usage'}
};

const BADGES = [
  {id:'proverb-10', name:'ことわざの道しるべ', condition:'ことわざを10語、しっかり理解', image:`${BADGE_ROOT}japanese/word-tree/badge.webp`},
  {id:'idiom-20', name:'慣用句の見つけ人', condition:'慣用句を20語、しっかり理解', image:`${BADGE_ROOT}japanese/word-detective/badge.webp`},
  {id:'four-30', name:'四字熟語の探究者', condition:'四字熟語を30語、しっかり理解', image:`${BADGE_ROOT}japanese/language-explorer/badge.webp`},
  {id:'all-50', name:'ことばのしるべマスター', condition:'3ジャンル合わせて50語、しっかり理解', image:`${BADGE_ROOT}common/mastery/badge.webp`}
];

const dom = {
  home: document.querySelector('#home-screen'), genre: document.querySelector('#genre-screen'), learn: document.querySelector('#learn-screen'),
  quiz: document.querySelector('#quiz-screen'), result: document.querySelector('#result-screen'), book: document.querySelector('#book-screen'),
  homeGenres: document.querySelector('#home-genres'), reviewCount: document.querySelector('#review-count'), homeMasterCount: document.querySelector('#home-master-count'),
  todayWord: document.querySelector('#today-word'), todayMeaning: document.querySelector('#today-meaning'),
  genreTitle: document.querySelector('#genre-screen-title'), genreSummary: document.querySelector('#genre-summary'), modeGrid: document.querySelector('#mode-grid'),
  difficultyList: document.querySelector('#difficulty-list'), genreReview: document.querySelector('#genre-review'), genreReviewText: document.querySelector('#genre-review-text'),
  learnGenreLabel: document.querySelector('#learn-genre-label'), learnCount: document.querySelector('#learn-count'), learnCategory: document.querySelector('#learn-category'), learnDifficulty: document.querySelector('#learn-difficulty'),
  learnWord: document.querySelector('#learn-word'), learnReading: document.querySelector('#learn-reading'), learnMeaning: document.querySelector('#learn-meaning'), learnScene: document.querySelector('#learn-scene'), learnNote: document.querySelector('#learn-note'), learnExample: document.querySelector('#learn-example'),
  learnPrev: document.querySelector('#learn-prev'), learnNext: document.querySelector('#learn-next'), learnUnderstood: document.querySelector('#learn-understood'), learnQuiz: document.querySelector('#learn-quiz'),
  quizModeLabel: document.querySelector('#quiz-mode-label'), quizProgressFill: document.querySelector('#quiz-progress-fill'), quizCount: document.querySelector('#quiz-count'), quizCombo: document.querySelector('#quiz-combo'),
  quizKind: document.querySelector('#quiz-kind'), quizScene: document.querySelector('#quiz-scene'), quizTitle: document.querySelector('#quiz-title'), quizHint: document.querySelector('#quiz-hint'), answerArea: document.querySelector('#answer-area'),
  feedbackPanel: document.querySelector('#feedback-panel'), feedbackCharacter: document.querySelector('#feedback-character'), feedbackTitle: document.querySelector('#feedback-title'), feedbackAnswer: document.querySelector('#feedback-answer'), feedbackExplanation: document.querySelector('#feedback-explanation'), nextQuestion: document.querySelector('#next-question'), quizHelp: document.querySelector('#quiz-help'),
  resultScore: document.querySelector('#result-score'), resultMessage: document.querySelector('#result-message'), resultMeaningCount: document.querySelector('#result-meaning-count'), resultSceneCount: document.querySelector('#result-scene-count'), resultReviewCount: document.querySelector('#result-review-count'), resultBadge: document.querySelector('#result-badge'), resultRetry: document.querySelector('#result-retry'), resultBook: document.querySelector('#result-book'),
  bookTotal: document.querySelector('#book-total'), bookMastered: document.querySelector('#book-mastered'), bookProgressFill: document.querySelector('#book-progress-fill'), bookFilters: document.querySelector('#book-filters'), bookGrid: document.querySelector('#book-grid'), bookDetail: document.querySelector('#book-detail'), closeBookDetail: document.querySelector('#close-book-detail'),
  bookDetailCategory: document.querySelector('#book-detail-category'), bookDetailWord: document.querySelector('#book-detail-word'), bookDetailReading: document.querySelector('#book-detail-reading'), bookDetailMeaning: document.querySelector('#book-detail-meaning'), bookDetailScene: document.querySelector('#book-detail-scene'), bookDetailExample: document.querySelector('#book-detail-example'), bookDetailNote: document.querySelector('#book-detail-note'), toast: document.querySelector('#toast')
};

const screenManager = new ScreenManager({eventTarget: document});
[['home',dom.home],['genre',dom.genre],['learn',dom.learn],['quiz',dom.quiz],['result',dom.result],['book',dom.book]].forEach(([id,node]) => screenManager.register(id,node));
const storage = new StorageManager('kotoba-no-shirube', {eventTarget: document});
const progress = new ProgressManager({storage, storageKey:'mastery-progress', ids:ALL_WORDS.map((word) => word.id), eventTarget:document});
const badgeManager = new BadgeManager({storage, storageKey:'badges', badges:BADGES, eventTarget:document});
const checker = new AnswerChecker({eventTarget:document, ignoreCase:true});

let selectedGenre = 'proverb';
let selectedDifficulty = 'all';
let learnWords = [];
let learnIndex = 0;
let selectedBookFilter = 'all';
let session = null;
let audioContext = null;

function defaultState() {
  return {schemaVersion:1, words:{}, reviewQueue:[], sessions:0, lastPlayedAt:null};
}

function loadState() {
  const saved = storage.load(STORAGE_KEY, null);
  if (!saved || typeof saved !== 'object') return defaultState();
  return {
    ...defaultState(), ...saved,
    words: saved.words && typeof saved.words === 'object' ? saved.words : {},
    reviewQueue: Array.isArray(saved.reviewQueue) ? [...new Set(saved.reviewQueue.map(String))] : []
  };
}

let state = loadState();

function saveState() {
  state.lastPlayedAt = new Date().toISOString();
  storage.save(STORAGE_KEY, state);
}

function wordState(wordId) {
  if (!state.words[wordId] || typeof state.words[wordId] !== 'object') {
    state.words[wordId] = {seen:false, meaning:false, scene:false, usage:false, wrong:0};
  }
  return state.words[wordId];
}

function stageFor(word) {
  const record = wordState(word.id);
  if (record.mastered || progress.isCompleted(word.id)) return {label:'しっかり理解', className:'mastered', index:4};
  if (record.scene) return {label:'場面で分かる', className:'scene', index:3};
  if (record.meaning) return {label:'意味が分かる', className:'meaning', index:2};
  if (record.seen) return {label:'見たことがある', className:'seen', index:1};
  return {label:'未学習', className:'new', index:0};
}

function isMastered(word) {
  const record = wordState(word.id);
  return Boolean(record.mastered || progress.isCompleted(word.id));
}

function masteredCount(words = ALL_WORDS) { return words.filter(isMastered).length; }
function genreById(id) { return GENRES.find((genre) => genre.id === id) || GENRES[0]; }
function genreLabel(id) { return genreById(id).label; }
function shuffle(items) {
  const copy = [...items];
  for (let i=copy.length-1;i>0;i-=1) { const j=Math.floor(Math.random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]; }
  return copy;
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => dom.toast.classList.remove('show'), 1800);
}

function updateWord(word, key) {
  const record = wordState(word.id);
  const changed = !record[key];
  record[key] = true;
  record.seen = true;
  if (record.meaning && record.scene && record.usage) {
    record.mastered = true;
    progress.complete(word.id);
  }
  if (record.meaning && record.scene) state.reviewQueue = state.reviewQueue.filter((id) => id !== word.id);
  saveState();
  renderHome();
  return changed;
}

function addWrong(word) {
  const record = wordState(word.id);
  record.seen = true;
  record.wrong = Number(record.wrong || 0) + 1;
  if (!state.reviewQueue.includes(word.id)) state.reviewQueue.push(word.id);
  saveState();
}

function checkBadges() {
  const counts = Object.fromEntries(GENRES.map((genre) => [genre.id, masteredCount(genre.data)]));
  const all = masteredCount();
  const awarded = [];
  if (counts.proverb >= 10 && badgeManager.award('proverb-10')) awarded.push(badgeManager.getDefinition('proverb-10'));
  if (counts.idiom >= 20 && badgeManager.award('idiom-20')) awarded.push(badgeManager.getDefinition('idiom-20'));
  if (counts.four >= 30 && badgeManager.award('four-30')) awarded.push(badgeManager.getDefinition('four-30'));
  if (all >= 50 && badgeManager.award('all-50')) awarded.push(badgeManager.getDefinition('all-50'));
  return awarded.filter(Boolean);
}

function setupSound() {
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audioContext ||= new AudioCtor();
    if (audioContext.state === 'suspended') audioContext.resume();
  } catch { audioContext = null; }
}

function playSound(id) {
  try {
    setupSound();
    const recipe = soundList.find((item) => item.id === id);
    if (recipe && audioContext) recipe.play(audioContext, 0.18);
  } catch { /* 音が使えない環境でも学習を続ける */ }
}

function renderHome() {
  const todayIndex = Math.floor(Date.now() / 86400000) % ALL_WORDS.length;
  const today = ALL_WORDS[todayIndex];
  dom.todayWord.textContent = today.word;
  dom.todayMeaning.textContent = today.easyMeaning;
  dom.reviewCount.textContent = state.reviewQueue.length;
  dom.homeMasterCount.textContent = masteredCount();
  dom.homeGenres.innerHTML = GENRES.map((genre) => {
    const count = masteredCount(genre.data);
    const seen = genre.data.filter((word) => wordState(word.id).seen).length;
    return `<button class="genre-card ${genre.color}" type="button" data-genre="${genre.id}"><span class="genre-icon">${escapeHtml(genre.icon)}</span><span class="genre-copy"><strong>${escapeHtml(genre.label)}</strong><small>${escapeHtml(genre.description)}</small><em>${count} / ${genre.data.length}語理解</em></span><span class="genre-arrow" aria-hidden="true">→</span><span class="genre-seen">${seen ? `見た ${seen}語` : 'まずは1語から'}</span></button>`;
  }).join('');
}

function renderGenreScreen() {
  const genre = genreById(selectedGenre);
  const mastered = masteredCount(genre.data);
  const seen = genre.data.filter((word) => wordState(word.id).seen).length;
  dom.genreTitle.textContent = genre.label;
  dom.genreSummary.innerHTML = `<div class="genre-summary-icon ${genre.color}">${escapeHtml(genre.icon)}</div><div><p>${escapeHtml(genre.short)}</p><strong>${escapeHtml(genre.description)}</strong><small>見たことがある ${seen}語　·　しっかり理解 ${mastered}語 / ${genre.data.length}語</small></div>`;
  const modes = ['meaning','scene','usage'];
  if (genre.id === 'idiom') modes.push('literal');
  dom.modeGrid.innerHTML = modes.map((mode) => {
    const def = MODE_DEFS[mode];
    return `<button class="mode-card mode-${mode}" type="button" data-mode="${mode}"><span class="mode-icon">${escapeHtml(def.icon)}</span><span class="mode-copy"><strong>${escapeHtml(def.label)}</strong><small>${escapeHtml(def.description)}</small></span><span class="mode-arrow">→</span></button>`;
  }).join('');
  dom.difficultyList.innerHTML = `<button class="difficulty-button ${selectedDifficulty === 'all' ? 'selected':''}" type="button" data-difficulty="all"><strong>ぜんぶ</strong><small>${genre.data.length}語から</small></button>${DIFFICULTIES.map((item) => `<button class="difficulty-button ${selectedDifficulty === item.id ? 'selected':''}" type="button" data-difficulty="${escapeHtml(item.id)}"><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.description)}</small></button>`).join('')}`;
  const reviewWords = state.reviewQueue.map((id) => ALL_WORDS.find((word) => word.id === id)).filter((word) => word && word.genre === selectedGenre);
  dom.genreReviewText.textContent = reviewWords.length ? `${reviewWords.length}語を、意味→場面の順にもう一度` : '間違えたことばがここに集まります';
  dom.genreReview.disabled = !reviewWords.length;
}

function openGenre(genreId) {
  selectedGenre = genreId || selectedGenre;
  selectedDifficulty = 'all';
  renderGenreScreen();
  screenManager.show('genre');
}

function renderLearnCard() {
  const word = learnWords[learnIndex];
  if (!word) return;
  const genre = genreById(word.genre);
  const stage = stageFor(word);
  wordState(word.id).seen = true;
  saveState();
  dom.learnGenreLabel.textContent = `${genre.label} · ことばを知る`;
  dom.learnCount.textContent = `${learnIndex + 1} / ${learnWords.length}`;
  dom.learnCategory.textContent = genre.label;
  dom.learnCategory.className = `category-pill ${genre.color}`;
  dom.learnDifficulty.textContent = word.difficulty;
  dom.learnDifficulty.className = `difficulty-pill ${stage.className}`;
  dom.learnWord.textContent = word.word;
  dom.learnReading.textContent = word.reading;
  dom.learnMeaning.textContent = word.easyMeaning;
  dom.learnScene.textContent = word.scene;
  dom.learnNote.textContent = word.note;
  dom.learnExample.textContent = word.example;
  dom.learnPrev.disabled = learnIndex === 0;
  dom.learnNext.textContent = learnIndex === learnWords.length - 1 ? '最初にもどる ↻' : '次のことば →';
  dom.learnUnderstood.textContent = wordState(word.id).meaning ? '意味はつかめた ✓' : '意味をつかんだ！ →';
}

function startLearn(options = {}) {
  const source = options.words || genreById(selectedGenre).data.filter((word) => selectedDifficulty === 'all' || word.difficulty === selectedDifficulty);
  learnWords = options.single ? source.slice(0,1) : shuffle(source).slice(0, Math.min(LEARN_SIZE, source.length));
  learnIndex = 0;
  renderLearnCard();
  screenManager.show('learn');
}

function otherWords(word, amount) {
  const pool = genreById(word.genre).data.filter((item) => item.id !== word.id);
  return shuffle(pool).slice(0, amount);
}

function makeQuestion(mode, word, sequence, source) {
  const def = MODE_DEFS[mode];
  let question;
  if (mode === 'meaning') {
    const other = otherWords(word, 2);
    const choices = [word.easyMeaning, word.misconception, other[0]?.easyMeaning || 'すばやく行動すること'];
    question = {question:`「${word.word}」の意味は？`, choices:[...new Set(choices)], answer:word.easyMeaning, explanation:`${word.word}は、${word.standardMeaning}`, hint:'ことばを文字どおりに受け取らず、説明の中心を考えよう。'};
  } else if (mode === 'scene') {
    const other = otherWords(word, 2);
    question = {question:word.scene, choices:[word.word, other[0]?.word || '一石二鳥', other[1]?.word || '十人十色'], answer:word.word, explanation:`この場面では「${word.word}」がぴったりです。${word.easyMeaning}`, hint:'その場面で、どんな気持ち・様子・教えが表れているか考えよう。'};
  } else if (mode === 'usage') {
    question = {question:`「${word.word}」の正しい使い方は？`, choices:[word.correctUsage, word.wrongUsage], answer:word.correctUsage, explanation:`「${word.word}」は、${word.easyMeaning}`, hint:'文全体の場面と、ことばの意味が合っているか確かめよう。'};
  } else {
    question = {question:`「${word.word}」は、ここではどちらの意味？`, choices:[word.literalMeaning, word.figurativeMeaning], answer:word.figurativeMeaning, explanation:`文字どおりなら「${word.literalMeaning}」ですが、慣用句では「${word.figurativeMeaning}」という意味です。`, hint:'体の部分や物が、本当にその状態になるのか考えよう。'};
  }
  return {id:`${mode}-${word.id}-${sequence}`, type:'choice', mode, wordId:word.id, word, kind:def.label, ...question, source};
}

function buildQuestions(mode, words, source='normal') {
  const pool = new QuestionPool([], {mode:'random'});
  const questions = [];
  const usable = words.length ? words : genreById(selectedGenre).data;
  for (let i=0;i<ROUND_SIZE;i+=1) {
    const word = usable[i % usable.length];
    questions.push(makeQuestion(mode, word, i, source));
  }
  pool.setItems(questions);
  return pool.take(ROUND_SIZE);
}

function reviewWordsForGenre(allGenres = false) {
  return state.reviewQueue.map((id) => ALL_WORDS.find((word) => word.id === id)).filter((word) => word && (allGenres || !selectedGenre || word.genre === selectedGenre));
}

function startQuiz(mode, options = {}) {
  setupSound();
  const genre = genreById(selectedGenre);
  const words = options.reviewOnly ? reviewWordsForGenre(Boolean(options.allGenres)) : genre.data.filter((word) => selectedDifficulty === 'all' || word.difficulty === selectedDifficulty);
  if (!words.length) { showToast(options.reviewOnly ? 'もういちど確かめることばはありません。' : 'この条件のことばがありません。'); return; }
  session = {mode, reviewOnly:Boolean(options.reviewOnly), reviewAll:Boolean(options.allGenres), questions:buildQuestions(mode, words, options.reviewOnly ? 'review' : 'normal'), index:0, locked:false, score:new ScoreManager(), combo:new ComboManager({eventTarget:document, milestones:[3,5,10]}), stats:{newMeaning:0,newScene:0}, badges:[]};
  state.sessions += 1;
  saveState();
  screenManager.show('quiz');
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const question = session?.questions[session.index];
  if (!question) { showResult(); return; }
  const def = MODE_DEFS[session.mode];
  session.locked = false;
  session.component = new ChoiceQuestion(question, {eventTarget:document, checker, shuffle:true});
  const word = question.word;
  dom.quizModeLabel.textContent = `${genreLabel(word.genre)} · ${def.label}`;
  dom.quizCount.textContent = `${session.index + 1} / ${ROUND_SIZE}`;
  dom.quizProgressFill.style.width = `${((session.index + 1) / ROUND_SIZE) * 100}%`;
  dom.quizCombo.textContent = session.combo.getCurrent() ? `${session.combo.getCurrent()} COMBO` : 'まずは1問';
  dom.quizKind.textContent = def.label;
  dom.quizScene.textContent = session.mode === 'scene' ? '場面を読んで考えよう' : session.mode === 'literal' ? 'そのままの意味と比べよう' : '';
  dom.quizTitle.textContent = question.question;
  dom.quizHint.textContent = '';
  dom.answerArea.replaceChildren();
  dom.answerArea.className = `answer-area answers-${question.choices.length}`;
  dom.feedbackPanel.hidden = true;
  question.choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'choice-button';
    button.dataset.choice = String(index);
    button.innerHTML = `<span class="choice-key">${String.fromCharCode(65 + index)}</span><span class="choice-label">${escapeHtml(choice)}</span>`;
    button.addEventListener('click', () => answerCurrent(choice));
    dom.answerArea.append(button);
  });
}

function answerCurrent(choice) {
  if (!session || session.locked) return;
  session.locked = true;
  const result = session.component.choose(choice);
  if (result.ignored) session.locked = false;
}

function naviUrl(id, pose) { return `${NAVI_ROOT}${id}/fullbody/${pose}.webp`; }

function showFeedback(question, isCorrect) {
  const character = ['riku','sora','kai','saku','tsuki','nami'][Math.floor(Math.random()*6)];
  dom.answerArea.classList.add('is-answered');
  dom.feedbackPanel.hidden = false;
  dom.feedbackPanel.classList.toggle('is-wrong', !isCorrect);
  dom.feedbackCharacter.src = naviUrl(character, isCorrect ? 'correct' : 'retry');
  dom.feedbackCharacter.alt = '';
  dom.feedbackTitle.textContent = isCorrect ? '意味とつながったね！' : 'もういちど、確かめよう。';
  dom.feedbackAnswer.textContent = isCorrect ? '正解！' : `答え：${question.answer}`;
  dom.feedbackExplanation.textContent = question.explanation;
  const effect = isCorrect ? 'effect-correct-pop' : 'effect-wrong-shake';
  dom.feedbackPanel.classList.remove('effect-correct-pop','effect-wrong-shake');
  void dom.feedbackPanel.offsetWidth;
  dom.feedbackPanel.classList.add(effect);
  dom.nextQuestion.focus({preventScroll:true});
}

function handleCorrect(event) {
  if (!session || !session.locked || event.detail.question !== session.questions[session.index]) return;
  const question = event.detail.question;
  const key = MODE_DEFS[session.mode].key;
  session.score.correct();
  session.combo.correct();
  if (key === 'meaning' && updateWord(question.word, 'meaning')) session.stats.newMeaning += 1;
  if (key === 'scene' && updateWord(question.word, 'scene')) session.stats.newScene += 1;
  if (key === 'usage') updateWord(question.word, 'usage');
  session.badges.push(...checkBadges());
  playSound(session.combo.getCurrent() >= 3 ? 'combo3' : 'correct');
  showFeedback(question, true);
  dom.quizCombo.textContent = `${session.combo.getCurrent()} COMBO`;
}

function handleWrong(event) {
  if (!session || !session.locked || event.detail.question !== session.questions[session.index]) return;
  const question = event.detail.question;
  session.score.wrong();
  session.combo.wrong();
  addWrong(question.word);
  playSound('softFail');
  showFeedback(question, false);
  dom.quizCombo.textContent = 'もう一度つなごう';
}

function showResult() {
  const result = session.score.getResult();
  const reviewCount = state.reviewQueue.length;
  dom.resultScore.textContent = result.correct;
  dom.resultMeaningCount.textContent = session.stats.newMeaning;
  dom.resultSceneCount.textContent = session.stats.newScene;
  dom.resultReviewCount.textContent = reviewCount;
  dom.resultMessage.textContent = result.correct === ROUND_SIZE ? 'すばらしい！ことばの意味を場面まで考えられました。' : result.correct >= 7 ? 'いい調子。分かったことばを、次は場面とつなげてみよう。' : 'ここからもう一度。説明と例文を手がかりに、ゆっくり考えよう。';
  if (session.badges.length) {
    const badge = session.badges[session.badges.length - 1];
    dom.resultBadge.hidden = false;
    dom.resultBadge.innerHTML = `<img src="${escapeHtml(badge.image)}" alt=""><div><strong>バッジを獲得</strong><span>${escapeHtml(badge.name)}</span><small>${escapeHtml(badge.condition)}</small></div>`;
    playSound('badge');
  } else dom.resultBadge.hidden = true;
  dom.resultRetry.textContent = session.reviewOnly ? 'もう一度、復習する' : '同じクイズをもう一度';
  screenManager.show('result');
}

function renderBookFilters() {
  const filters = [{id:'all',label:'すべて'},...GENRES.map((genre) => ({id:genre.id,label:genre.label})),{id:'mastered',label:'しっかり理解'}];
  dom.bookFilters.innerHTML = filters.map((filter) => `<button class="book-filter ${selectedBookFilter === filter.id ? 'selected':''}" type="button" role="tab" aria-selected="${selectedBookFilter === filter.id}" data-book-filter="${filter.id}">${escapeHtml(filter.label)}</button>`).join('');
}

function renderBook() {
  const mastered = masteredCount();
  dom.bookTotal.textContent = `${mastered} / ${ALL_WORDS.length}語`;
  dom.bookMastered.textContent = mastered;
  dom.bookProgressFill.style.width = `${Math.round((mastered / ALL_WORDS.length) * 100)}%`;
  renderBookFilters();
  let words = selectedBookFilter === 'all' ? ALL_WORDS : selectedBookFilter === 'mastered' ? ALL_WORDS.filter(isMastered) : genreById(selectedBookFilter).data;
  words = [...words].sort((a,b) => Number(isMastered(b)) - Number(isMastered(a)) || Number(wordState(b.id).seen) - Number(wordState(a.id).seen));
  if (!words.length) { dom.bookGrid.innerHTML = '<div class="empty-state"><span>まだありません</span><p>クイズで意味と場面をつなげると、ここにことばが増えていきます。</p></div>'; return; }
  dom.bookGrid.innerHTML = words.map((word) => {
    const stage = stageFor(word);
    const locked = stage.index === 0;
    return `<button class="book-card ${locked ? 'is-locked':''} ${stage.className}" type="button" data-book-word="${word.id}"><span class="book-card-status">${locked ? 'これから' : stage.label}</span><strong>${locked ? '？？？？' : escapeHtml(word.word)}</strong><small>${locked ? '学ぶと開きます' : escapeHtml(word.easyMeaning)}</small><span class="book-card-genre">${escapeHtml(genreLabel(word.genre))}</span></button>`;
  }).join('');
}

function openBookDetail(wordId) {
  const word = ALL_WORDS.find((item) => item.id === wordId);
  if (!word || !wordState(word.id).seen) { showToast('まずはことばを学んでみよう。'); return; }
  const genre = genreById(word.genre);
  dom.bookDetailCategory.textContent = genre.label;
  dom.bookDetailCategory.className = `category-pill ${genre.color}`;
  dom.bookDetailWord.textContent = word.word;
  dom.bookDetailReading.textContent = word.reading;
  dom.bookDetailMeaning.textContent = word.easyMeaning;
  dom.bookDetailScene.textContent = word.scene;
  dom.bookDetailExample.textContent = word.example;
  dom.bookDetailNote.textContent = word.note;
  dom.bookDetail.hidden = false;
  dom.bookDetail.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function showBook() {
  renderBook();
  dom.bookDetail.hidden = true;
  screenManager.show('book');
}

function attachEvents() {
  document.addEventListener(EDU_EVENTS.CORRECT, handleCorrect);
  document.addEventListener(EDU_EVENTS.WRONG, handleWrong);
  document.addEventListener('click', (event) => {
    const genreButton = event.target.closest('[data-genre]');
    if (genreButton) openGenre(genreButton.dataset.genre);
    const modeButton = event.target.closest('[data-mode]');
    if (modeButton) startQuiz(modeButton.dataset.mode);
    const difficultyButton = event.target.closest('[data-difficulty]');
    if (difficultyButton) { selectedDifficulty = difficultyButton.dataset.difficulty; renderGenreScreen(); }
    const screenButton = event.target.closest('[data-screen]');
    if (screenButton) { if (screenButton.dataset.screen === 'book') showBook(); else screenManager.show(screenButton.dataset.screen); }
    const backButton = event.target.closest('[data-back]');
    if (backButton) screenManager.show(backButton.dataset.back);
    const bookFilter = event.target.closest('[data-book-filter]');
    if (bookFilter) { selectedBookFilter = bookFilter.dataset.bookFilter; renderBook(); }
    const bookWord = event.target.closest('[data-book-word]');
    if (bookWord) openBookDetail(bookWord.dataset.bookWord);
  });
  document.querySelector('#hero-start').addEventListener('click', () => openGenre(selectedGenre));
  document.querySelector('#hero-review').addEventListener('click', () => {
    if (!state.reviewQueue.length) { showToast('間違えたことばは、まだありません。'); return; }
    startQuiz('meaning', {reviewOnly:true, allGenres:true});
  });
  document.querySelector('#today-open').addEventListener('click', () => {
    const todayIndex = Math.floor(Date.now() / 86400000) % ALL_WORDS.length;
    startLearn({words:[ALL_WORDS[todayIndex]],single:true});
  });
  document.querySelector('#home-book').addEventListener('click', showBook);
  dom.genreReview.addEventListener('click', () => startQuiz('meaning', {reviewOnly:true}));
  dom.learnPrev.addEventListener('click', () => { if (learnIndex > 0) { learnIndex -= 1; renderLearnCard(); } });
  dom.learnNext.addEventListener('click', () => { learnIndex = learnIndex === learnWords.length - 1 ? 0 : learnIndex + 1; renderLearnCard(); });
  dom.learnUnderstood.addEventListener('click', () => { const word = learnWords[learnIndex]; if (word && updateWord(word, 'meaning')) showToast('意味が記録されました。'); renderLearnCard(); });
  dom.learnQuiz.addEventListener('click', () => startQuiz('meaning'));
  dom.nextQuestion.addEventListener('click', () => { session.index += 1; renderQuizQuestion(); });
  dom.quizHelp.addEventListener('click', () => {
    if (!session) return;
    const question = session.questions[session.index];
    dom.quizHint.textContent = question.hint;
    playSound('hint');
  });
  dom.resultRetry.addEventListener('click', () => startQuiz(session.mode, {reviewOnly:session.reviewOnly, allGenres:session.reviewAll}));
  dom.resultBook.addEventListener('click', showBook);
  dom.closeBookDetail.addEventListener('click', () => { dom.bookDetail.hidden = true; });
  document.addEventListener('keydown', (event) => {
    if (!session || screenManager.getCurrent() !== 'quiz' || session.locked) return;
    const index = ['a','b','c','d'].indexOf(event.key.toLowerCase());
    const button = dom.answerArea.querySelectorAll('.choice-button')[index];
    if (button) button.click();
  });
  document.addEventListener('pointerdown', setupSound, {once:true});
}

document.addEventListener(EDU_EVENTS.STORAGE_ERROR, () => showToast('記録を一時的に保存できませんが、学習は続けられます。'));
renderHome();
attachEvents();
screenManager.show('home');
