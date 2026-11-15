import {describe,expect,it} from 'vitest';import {emptyProject,fromKit,refresh,sentence} from './project';
describe('canonical project model',()=>{it('builds both kits into editable sentences and bricks',()=>{for(const id of ['to-be','have-got']){const p=fromKit(id);expect(p.sentences.length).toBeGreaterThanOrEqual(8);expect(p.bricks.length).toBeGreaterThan(5);expect(p.bricks.every(b=>b.studs&&b.studs>=2&&b.studs<=16)).toBe(true)}});it('keeps manual quantity overrides after sentence edits',()=>{let p=emptyProject();p={...p,sentences:[sentence('a cat and a dog',p)]};p=refresh(p);const a=p.bricks.find(b=>b.normalized==='a')!;p={...p,bricks:p.bricks.map(b=>b.id===a.id?{...b,manualQuantity:7,quantity:7}:b),sentences:[{...p.sentences[0]!,text:'a cat'}]};p=refresh(p);expect(p.bricks.find(b=>b.normalized==='a')?.quantity).toBe(7)})});
it('updates brick lettering after a case-only edit and keeps brick settings', () => {
  const initial = emptyProject();
  const project = refresh({ ...initial, sentences: [sentence('She', initial)] });
  const brick = { ...project.bricks[0]!, manualQuantity: 3, bodyColor: '#123456' };
  expect(brick.text).toBe('She');

  const edited = refresh({
    ...project,
    sentences: [
      { ...project.sentences[0]!, text: 'she' },
      { ...sentence('She', project), enabled: false },
    ],
    bricks: [brick],
  });

  expect(edited.bricks).toHaveLength(1);
  expect(edited.bricks[0]).toMatchObject({
    id: brick.id,
    text: 'she',
    normalized: 'she',
    bodyColor: '#123456',
    quantity: 3,
  });
});
