/// <reference lib="webworker" />
import { strToU8, zipSync } from "fflate";
import {
  createBrickMeshes,
  disposeBrickMeshes,
  geometryToBinaryStl,
  initializeGeometry,
  layoutToBinaryStl,
  safeFilename,
} from "../geometry/createBrick";
import { BODY_HEIGHT } from "../geometry/dimensions";
import type { PrintBedLayout } from "../domain/types";
import type { GeometryRequest, GeometryResponse } from "./protocol";

const send = (message: GeometryResponse, transfer: Transferable[] = []) =>
  self.postMessage(message, { transfer });

function createZip({
  bricks,
  settings,
  options,
  layout,
}: Extract<GeometryRequest, { type: "zip" }>) {
  const files: Record<string, Uint8Array> = {};
  const usedNames = new Set<string>();
  const generated = new Map<
    string,
    {
      brick: (typeof bricks)[number];
      geometry: ReturnType<typeof createBrickMeshes>["merged"];
    }
  >();
  const total = bricks.length + layout.plates + 1;
  let done = 0;
  const progress = () => send({ type: "progress", done: ++done, total });

  try {
    const parts = bricks.map((brick) => {
      const base = safeFilename(brick.text);
      let name = base;
      for (let suffix = 2; usedNames.has(name.toLowerCase()); suffix++) {
        name = `${base}-${suffix}`;
      }
      usedNames.add(name.toLowerCase());

      const meshes = createBrickMeshes(brick, settings);
      generated.set(brick.id, { brick, geometry: meshes.merged });
      const size = `2x${brick.studs}`;
      const file = `bricks/${name}-brick-${size}.stl`;
      try {
        const stl = new Uint8Array(geometryToBinaryStl(meshes.merged));
        files[file] = stl;
        if (options.separateColors) {
          files[`multicolor/${name}-brick-body.stl`] = new Uint8Array(
            geometryToBinaryStl(meshes.body),
          );
          files[`multicolor/${name}-brick-text.stl`] = new Uint8Array(
            geometryToBinaryStl(meshes.text),
          );
        }
        if (options.expandQuantities) {
          for (let copy = 1; copy <= brick.quantity; copy++) {
            const index = String(copy).padStart(2, "0");
            const count = String(brick.quantity).padStart(2, "0");
            files[`quantities/${name}-brick-${index}-of-${count}.stl`] = stl;
          }
        }
      } finally {
        meshes.body.dispose();
        meshes.text.dispose();
      }
      progress();
      return {
        id: brick.id,
        text: brick.text,
        construction: "fullBrick",
        quantity: brick.quantity,
        size,
        file,
        dimensionsMm: [
          brick.lengthMm,
          brick.widthMm,
          BODY_HEIGHT + settings.textHeight,
        ],
      };
    });

    const plates = new Map<number, PrintBedLayout["placed"]>();
    for (const placement of layout.placed) {
      const plate = plates.get(placement.plate);
      if (plate) plate.push(placement);
      else plates.set(placement.plate, [placement]);
    }
    for (const [plate, placements] of plates) {
      const items = placements.map(({ brickId, x, y, rotated }) => {
        const part = generated.get(brickId);
        if (!part) throw new Error("Layout references an unknown brick");
        return { ...part, x, y, rotated };
      });
      const number = String(plate).padStart(2, "0");
      files[`layouts/plate-${number}.stl`] = new Uint8Array(
        layoutToBinaryStl(items, options.bedWidth, options.bedDepth),
      );
      progress();
    }
    files["manifest.json"] = strToU8(
      JSON.stringify(
        {
          schemaVersion: 1,
          units: "mm",
          parts,
          plates: layout.plates,
          layout,
        },
        null,
        2,
      ),
    );
    files["README.txt"] = strToU8(
      [
        "WordBrickLab export",
        "",
        `Construction: fullBrick. Units: millimetres. Origin: centre of each part, open underside at Z=0.`,
        "STL has no color or print profile. Import separate body and text files as parts of one object without changing their coordinates.",
        `For a merged model, change filament at Z=${BODY_HEIGHT} mm where raised text begins.`,
        "Layout STLs contain separate islands. Positions are recorded in manifest.json.",
        "",
        "Print a calibration part before a large batch to check clutch fit.",
      ].join("\n"),
    );
    const zip = zipSync(files, { level: 6 });
    return zip.buffer as ArrayBuffer;
  } finally {
    for (const { geometry } of generated.values()) geometry.dispose();
  }
}

self.onmessage = async ({ data }: MessageEvent<GeometryRequest>) => {
  try {
    await initializeGeometry();
    let file: ArrayBuffer;
    if (data.type === "zip") {
      file = createZip(data);
    } else {
      const meshes = createBrickMeshes(data.brick, data.settings);
      try {
        file = geometryToBinaryStl(meshes.merged);
      } finally {
        disposeBrickMeshes(meshes);
      }
    }
    send({ type: "done", file }, [file]);
  } catch (error) {
    send({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
