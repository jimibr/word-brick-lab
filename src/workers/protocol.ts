import type {
  BrickDefinition,
  GeometrySettings,
  PrintBedLayout,
  Project,
} from "../domain/types";

export type GeometryRequest =
  | { type: "single"; brick: BrickDefinition; settings: GeometrySettings }
  | {
      type: "zip";
      bricks: BrickDefinition[];
      settings: GeometrySettings;
      options: Project["export"];
      layout: PrintBedLayout;
    };

export type GeometryResponse =
  | { type: "progress"; done: number; total: number }
  | { type: "done"; file: ArrayBuffer }
  | { type: "error"; message: string };
