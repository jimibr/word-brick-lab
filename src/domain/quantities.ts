import type { BrickDefinition, QuantityMode, Sentence } from './types';
import { CATEGORY_COLORS, makeId } from './types';
import { studsForText } from '../geometry/dimensions';
import { measureTextWidth,unsupportedGlyphs } from '../geometry/font';

export function computeCounts(sentences:Sentence[],mode:QuantityMode){
  const enabled=sentences.filter(s=>s.enabled); const result=new Map<string,number>();
  for(const sentence of enabled){
    const local=new Map<string,number>();
    for(const token of sentence.tokens)local.set(token.normalized,(local.get(token.normalized)??0)+1);
    for(const [key,count] of local)result.set(key,mode==='reusable'?Math.max(result.get(key)??0,count):(result.get(key)??0)+count);
  }
  return result;
}
export function deriveBricks(sentences:Sentence[],mode:QuantityMode,fontSize:number,margin:number,previous:BrickDefinition[]=[]):BrickDefinition[]{
  const counts=computeCounts(sentences,mode);
  const representative=new Map(
    sentences.filter(s=>s.enabled).flatMap(s=>s.tokens).map(t=>[t.normalized,t]),
  );
  return [...counts.entries()].map(([normalized,computedQuantity])=>{
    const token=representative.get(normalized)!; const old=previous.find(b=>b.normalized===normalized);
    const text=token.text;
    const fit=studsForText(text,fontSize,margin,measureTextWidth(text,fontSize));
    const unsupported=unsupportedGlyphs(text);const errors=[...(fit.error?[fit.error]:[]),...(unsupported.length?[`Unsupported glyphs: ${unsupported.join(' ')}`]:[])];
    return {...old,id:old?.id??makeId('brick'),text,normalized,category:old?.category??token.category,bodyColor:old?.bodyColor??CATEGORY_COLORS[token.category],textColor:old?.textColor??'#ffffff',studs:errors.length?null:fit.studs,widthMm:15.8,lengthMm:errors.length?null:(fit.studs?8*fit.studs-.2:null),computedQuantity,quantity:old?.manualQuantity??computedQuantity,errors};
  }).sort((a,b)=>a.text.localeCompare(b.text));
}
