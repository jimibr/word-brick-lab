import type { ContractionMode, GrammarCategory, PunctuationMode, Token } from './types';
import { makeId } from './types';

const pronouns=new Set(['i','you','he','she','it','we','they']);
const verbs=new Set(['am','is','are','was','were','be','being','been','have','has','had','got','do','does','did',"'m","'re","'s","'ve","'d"]);
const articles=new Set(['a','an','the']);
const punctuation=/^[.,!?;:]$/u;
const wordPattern=/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*|[.,!?;:]|[^\s]/gu;

export function normalizeToken(text:string){return text.normalize('NFC').replaceAll('’',"'").toLocaleLowerCase('en');}
export function categoryFor(text:string):GrammarCategory{
  const n=normalizeToken(text);
  if(punctuation.test(text)) return 'punctuation';
  if(pronouns.has(n)) return 'pronoun';
  if(articles.has(n)) return 'article';
  if(verbs.has(n)||/^(?:is|are|was|were|has|have|do|does)n['’]t$/.test(n)) return 'verb';
  return 'other';
}
function splitContraction(token:string):string[]{
  const match=token.match(/^(.+?)(n[’']t|[’'](?:m|re|s|ve|d|ll))$/iu);
  return match?[match[1]!,match[2]!.replace('’',"'")]:[token];
}
export function tokenize(text:string,sentenceId:string,punctuationMode:PunctuationMode,contractionMode:ContractionMode):Token[]{
  const raw=text.match(wordPattern)??[];
  const pieces=raw.flatMap(t=>contractionMode==='segmented'?splitContraction(t):[t]);
  const final:string[]=[];
  for(const part of pieces){
    if(punctuationMode==='attached'&&punctuation.test(part)&&final.length) final[final.length-1]+=part;
    else final.push(part);
  }
  return final.filter(Boolean).map(text=>({id:makeId('tok'),text,normalized:normalizeToken(text),category:categoryFor(text),sentenceId}));
}
