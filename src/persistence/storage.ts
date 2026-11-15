import { z } from "zod";
import {
  DEFAULT_EXPORT,
  DEFAULT_GEOMETRY,
  SCHEMA_VERSION,
} from "../domain/types";
import type { Project } from "../domain/types";
import { refresh } from "../domain/project";
import {
  MAX_PROJECT_FILE_BYTES,
  MAX_PROJECT_PIECES,
  MAX_PROJECT_TEXT,
} from "../domain/limits";

const key = "wordbricklab.project.v1";
const id = z.string().min(1).max(100);
const text = z.string().max(MAX_PROJECT_TEXT);
const category = z.enum([
  "pronoun",
  "verb",
  "article",
  "noun",
  "adjective",
  "punctuation",
  "other",
]);
const count = z.number().int().min(0).max(MAX_PROJECT_TEXT);
const color = z.string().regex(/^#(?:[\da-f]{3}|[\da-f]{6})$/i);
const number = (min: number, max: number) => z.number().min(min).max(max);
const token = z.object({
  id,
  text,
  normalized: text,
  category,
  sentenceId: id,
});
const sentence = z.object({
  id,
  text,
  enabled: z.boolean(),
  tokens: z.array(token).max(MAX_PROJECT_TEXT),
});
const brick = z.object({
  id,
  text: text.min(1),
  normalized: text.min(1),
  category,
  bodyColor: color,
  textColor: color,
  studs: z.number().int().min(2).max(16).nullable(),
  widthMm: z.literal(15.8),
  lengthMm: number(15.8, 127.8).nullable(),
  computedQuantity: count,
  quantity: count,
  manualQuantity: count.max(MAX_PROJECT_PIECES).optional(),
  errors: z.array(text).max(10),
});
const geometry = z.object({
  construction: z.enum(["fullBrick", "snapTile"]),
  fontSize: number(4, 10),
  textHeight: number(0.2, 3),
  edgeMargin: number(1, 5),
  wallThickness: number(1.2, 2.4),
  topThickness: number(0.8, 4),
  supportTubes: z.boolean(),
  tubeOuterDiameter: number(6, 7),
  tubeInnerDiameter: number(4.2, 5.4),
  clutchClearance: number(0, 0.4),
  xyCompensation: number(-2, 2),
  edgeRadius: number(0, 3),
});
const exportSettings = z.object({
  expandQuantities: z.boolean(),
  separateColors: z.boolean(),
  bedWidth: number(100, 500),
  bedDepth: number(100, 500),
  bedMargin: number(0, 49),
  gap: number(0.1, 20),
  allowRotation: z.boolean(),
});
const project = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(SCHEMA_VERSION)]),
    id,
    name: text,
    updatedAt: z.iso.datetime(),
    locale: z.enum(["cs", "en"]),
    kitId: id.optional(),
    punctuationMode: z.enum(["separate", "attached"]),
    contractionMode: z.enum(["whole", "segmented"]),
    quantityMode: z.enum(["reusable", "simultaneous"]),
    sentences: z.array(sentence).max(MAX_PROJECT_TEXT),
    bricks: z.array(brick).max(MAX_PROJECT_TEXT),
    geometry: geometry.partial(),
    export: exportSettings.partial(),
  })
  .superRefine(({ sentences, bricks }, ctx) => {
    if (
      sentences.reduce((length, item) => length + item.text.length + 1, 0) >
      MAX_PROJECT_TEXT + 1
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["sentences"],
        message: "Project text is too long",
      });
    }
    for (const [path, items] of [
      ["sentences", sentences],
      ["bricks", bricks],
    ] as const) {
      if (new Set(items.map((item) => item.id)).size !== items.length) {
        ctx.addIssue({
          code: "custom",
          path: [path],
          message: "Duplicate IDs",
        });
      }
    }
  });

export function saveProject(value: Project) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadProject(): Project | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved = parseProject(raw);
    return { ...refresh(saved), updatedAt: saved.updatedAt };
  } catch {
    return null;
  }
}

export function parseProject(raw: string): Project {
  if (raw.length > MAX_PROJECT_FILE_BYTES)
    throw new Error("Project file is too large");
  const data = project.parse(JSON.parse(raw));
  return {
    ...data,
    schemaVersion: SCHEMA_VERSION,
    // Legacy tile projects retain their contents and use the classic brick body.
    geometry: { ...DEFAULT_GEOMETRY, ...data.geometry, construction: "fullBrick" },
    export: { ...DEFAULT_EXPORT, ...data.export },
  };
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
