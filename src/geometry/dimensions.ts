export const BRICK_WIDTH=15.8, BODY_HEIGHT=9.6, STUD_PITCH=8;
// Conservative deterministic estimate used before the exact glyph-outline measurement in the geometry worker.
export function estimatedTextWidth(text:string,fontSize:number){
  return [...text].reduce((sum,c)=>sum+fontSize*(/[MW@]/.test(c)?.9:/[ilI.'’]/.test(c)?.3:.58),0);
}
export function studsForText(text:string,fontSize:number,margin:number,width=estimatedTextWidth(text,fontSize)):{studs:number|null,error?:string}{
  if(!text.trim())return {studs:null,error:'Empty text is not printable'};
  for(let n=2;n<=16;n++)if(width+2*margin<=8*n-.2)return {studs:n};
  return {studs:null,error:'Text is too wide for a 2×16 brick at the global font size'};
}
export function dimensions(studs:number){if(!Number.isInteger(studs)||studs<2||studs>16)throw new RangeError('Stud length must be 2–16');return {width:BRICK_WIDTH,length:8*studs-.2,height:BODY_HEIGHT};}
