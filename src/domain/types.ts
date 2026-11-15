export const SCHEMA_VERSION = 2 as const;
export type Locale = 'cs' | 'en';
export type GrammarCategory = 'pronoun'|'verb'|'article'|'noun'|'adjective'|'punctuation'|'other';
export type PunctuationMode = 'separate'|'attached';
export type ContractionMode = 'whole'|'segmented';
export type QuantityMode = 'reusable'|'simultaneous';
export interface Token { id:string; text:string; normalized:string; category:GrammarCategory; sentenceId:string; }
export interface Sentence { id:string; text:string; enabled:boolean; tokens:Token[]; }
export interface GeometrySettings { construction:'fullBrick'; fontSize:number; textHeight:number; edgeMargin:number; wallThickness:number; topThickness:number; supportTubes:boolean; tubeOuterDiameter:number; tubeInnerDiameter:number; clutchClearance:number; xyCompensation:number; edgeRadius:number; }
export interface ExportSettings { expandQuantities:boolean; separateColors:boolean; bedWidth:number; bedDepth:number; bedMargin:number; gap:number; allowRotation:boolean; }
export interface BrickDefinition { id:string; text:string; normalized:string; category:GrammarCategory; bodyColor:string; textColor:string; studs:number|null; widthMm:number; lengthMm:number|null; quantity:number; computedQuantity:number; manualQuantity?:number; errors:string[]; }
export interface Kit { id:string; nameKey:string; descriptionKey:string; contractionMode:ContractionMode; sentences:Array<{id:string;text:string}>; }
export interface Project { schemaVersion:typeof SCHEMA_VERSION; id:string; name:string; updatedAt:string; locale:Locale; kitId?:string; punctuationMode:PunctuationMode; contractionMode:ContractionMode; quantityMode:QuantityMode; sentences:Sentence[]; bricks:BrickDefinition[]; geometry:GeometrySettings; export:ExportSettings; }
export interface PlacedBrick { instanceId:string; brickId:string; plate:number; x:number; y:number; width:number; depth:number; rotated:boolean; }
export interface PrintBedLayout { plates:number; placed:PlacedBrick[]; unplaced:string[]; }

export const DEFAULT_GEOMETRY:GeometrySettings={construction:'fullBrick',fontSize:7,textHeight:1.2,edgeMargin:2,wallThickness:1.5,topThickness:1.4,supportTubes:true,tubeOuterDiameter:6.5,tubeInnerDiameter:4.8,clutchClearance:.15,xyCompensation:0,edgeRadius:.35};
export const DEFAULT_EXPORT:ExportSettings={expandQuantities:true,separateColors:false,bedWidth:180,bedDepth:180,bedMargin:5,gap:3,allowRotation:true};
export const CATEGORY_COLORS:Record<GrammarCategory,string>={pronoun:'#4f7cff',verb:'#ef5b5b',article:'#f5b342',noun:'#44b88a',adjective:'#9a6ee8',punctuation:'#667085',other:'#64748b'};
export const makeId=(prefix='id')=>`${prefix}-${crypto.randomUUID()}`;
