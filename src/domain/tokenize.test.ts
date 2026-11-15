import { describe,expect,it } from 'vitest';import { tokenize } from './tokenize';
describe('tokenization',()=>{
 it('preserves contractions and separates punctuation',()=>expect(tokenize("I'm here?",'s','separate','whole').map(t=>t.text)).toEqual(["I'm",'here','?']));
 it('segments curly contractions explicitly',()=>expect(tokenize('I’ve got it.','s','separate','segmented').map(t=>t.text)).toEqual(['I',"'ve",'got','it','.']));
 it('attaches punctuation when selected',()=>expect(tokenize('A cat.','s','attached','whole').map(t=>t.text)).toEqual(['A','cat.']));
 it('handles empty text',()=>expect(tokenize('  ','s','separate','whole')).toEqual([]));
});
