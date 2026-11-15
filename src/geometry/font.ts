import { ShapeGeometry } from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import fontJson from 'three/examples/fonts/helvetiker_bold.typeface.json';
export const bundledFont=new FontLoader().parse(fontJson);
export const printableText=(text:string)=>text.replaceAll('’',"'");
export function unsupportedGlyphs(text:string){const glyphs=(bundledFont.data as {glyphs:Record<string,unknown>}).glyphs;return [...new Set([...printableText(text)].filter(char=>char!=='\n'&&!glyphs[char]))]}
export function measureTextWidth(text:string,fontSize:number){
 const shapes=bundledFont.generateShapes(printableText(text),fontSize);if(!shapes.length)return 0;const geometry=new ShapeGeometry(shapes,8);geometry.computeBoundingBox();const box=geometry.boundingBox;const width=box?box.max.x-box.min.x:0;geometry.dispose();return width;
}
