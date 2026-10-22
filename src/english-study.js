import { parseCloze } from './core.js';

/** Derive study presentation without altering card content or its shared FSRS schedule. */
export function getStudyContent(card, direction = 'en-zh', revealed = false) {
  const cloze = card.kind === 'cloze' ? parseCloze(card.front) : null;
  const english = card.subject === 'english';
  const isReverse = english && direction === 'zh-en';
  const completeFront = cloze ? cloze.answer : card.front;
  if (isReverse) {
    return {
      question: card.back || '请回想这张卡片的完整英文。',
      answer: completeFront,
      explanation: '',
      instruction: '根据中文，回想对应的英文表达',
      answerLabel: '英文答案',
      isReverse: true,
      speechText: revealed ? completeFront : '',
    };
  }
  const question = cloze ? cloze.question : card.front;
  return {
    question,
    answer: cloze ? cloze.answer : card.back,
    explanation: cloze ? card.back : '',
    instruction: cloze ? '在心里补全空缺的内容' : '试着在心里说出答案',
    answerLabel: '参考答案',
    isReverse: false,
    speechText: english ? (cloze && !revealed ? question.replace(/［[^］]*］/g, 'blank') : completeFront) : '',
  };
}
