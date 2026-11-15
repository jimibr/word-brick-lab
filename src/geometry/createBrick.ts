import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import Module, { type Manifold, type Vec2 } from "manifold-3d";
import wasmUrl from "manifold-3d/manifold.wasm?url";
import type { BrickDefinition, GeometrySettings } from "../domain/types";
import { BODY_HEIGHT, STUD_PITCH } from "./dimensions";
import { bundledFont, printableText } from "./font";

export interface BrickMeshes {
  body: THREE.BufferGeometry;
  text: THREE.BufferGeometry;
  merged: THREE.BufferGeometry;
  exactTextWidth: number;
}

let kernel: Awaited<ReturnType<typeof Module>>;
let initialization: Promise<void> | undefined;

export function initializeGeometry(wasmLocation = wasmUrl) {
  return (initialization ??= Module({ locateFile: () => wasmLocation }).then(
    (module) => {
      module.setup();
      kernel = module;
    },
  ));
}

function toGeometry(solid: Manifold) {
  if (solid.status() !== "NoError" || solid.isEmpty()) {
    throw new Error("Could not generate a valid solid");
  }
  const { vertProperties, triVerts } = solid.getMesh();
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute(
    "position",
    new THREE.BufferAttribute(vertProperties, 3),
  );
  indexed.setIndex(new THREE.BufferAttribute(triVerts, 1));
  const geometry = indexed.toNonIndexed();
  indexed.dispose();
  geometry.computeVertexNormals();
  return geometry;
}

export function createBrickMeshes(
  brick: BrickDefinition,
  settings: GeometrySettings,
): BrickMeshes {
  if (!brick.lengthMm || !brick.studs || brick.errors.length) {
    throw new Error(brick.errors[0] ?? "Invalid brick");
  }

  const { CrossSection, Manifold } = kernel;
  const length = brick.lengthMm;
  const width = brick.widthMm;
  const height = BODY_HEIGHT;
  const wall = settings.wallThickness;
  const cavityDepth = height - settings.topThickness;
  const overlap = 0.01;
  const solids: Manifold[] = [];
  const sections: InstanceType<typeof CrossSection>[] = [];
  const output: THREE.BufferGeometry[] = [];
  const keepSolid = (solid: Manifold) => {
    solids.push(solid);
    return solid;
  };
  const keepSection = (section: InstanceType<typeof CrossSection>) => {
    sections.push(section);
    return section;
  };
  const geometry = (solid: Manifold) => {
    const result = toGeometry(solid);
    output.push(result);
    return result;
  };

  try {
    const outer = keepSolid(Manifold.cube([length, width, height], true));
    const inner = keepSolid(
      Manifold.cube(
        [length - 2 * wall, width - 2 * wall, cavityDepth + overlap],
        true,
      ),
    );
    const shiftedInner = keepSolid(
      inner.translate(0, 0, (cavityDepth - overlap - height) / 2),
    );
    const hollow = keepSolid(outer.subtract(shiftedInner));
    const shell = keepSolid(hollow.translate(0, 0, height / 2));
    let body = shell;
    if (settings.supportTubes) {
      const radius = (settings.tubeOuterDiameter - settings.clutchClearance) / 2;
      const holeRadius = (settings.tubeInnerDiameter + settings.clutchClearance) / 2;
      const ringOuter = keepSection(CrossSection.circle(radius, 64));
      const ringInner = keepSection(CrossSection.circle(holeRadius, 64));
      const ringSection = keepSection(ringOuter.subtract(ringInner));
      const ring = keepSolid(ringSection.extrude(cavityDepth + overlap));
      const supports: Manifold[] = [];
      for (let i = 1; i < brick.studs; i++) {
        const x = (i - brick.studs / 2) * STUD_PITCH;
        supports.push(keepSolid(ring.translate(x, 0, 0)));
      }
      body = keepSolid(Manifold.union([shell, ...supports]));
    }

    const glyphs = bundledFont.generateShapes(
      printableText(brick.text),
      settings.fontSize,
    );
    const outlines = glyphs.map((glyph) => {
      const { shape, holes } = glyph.extractPoints(8);
      const contours = [shape, ...holes].map((points) =>
        points.map(({ x, y }): Vec2 => [x, y]),
      );
      return keepSection(new CrossSection(contours, "EvenOdd"));
    });
    const lettering = keepSection(CrossSection.union(outlines));
    const bounds = lettering.bounds();
    const centered = keepSection(
      lettering.translate(
        -(bounds.min[0] + bounds.max[0]) / 2,
        -(bounds.min[1] + bounds.max[1]) / 2,
      ),
    );
    const textExtrusion = keepSolid(centered.extrude(settings.textHeight));
    const text = keepSolid(textExtrusion.translate(0, 0, height));
    const embeddedExtrusion = keepSolid(
      centered.extrude(settings.textHeight + overlap),
    );
    const embedded = keepSolid(
      embeddedExtrusion.translate(0, 0, height - overlap),
    );
    const merged = keepSolid(Manifold.union([body, embedded]));

    return {
      body: geometry(body),
      text: geometry(text),
      merged: geometry(merged),
      exactTextWidth: bounds.max[0] - bounds.min[0],
    };
  } catch (error) {
    output.forEach((item) => item.dispose());
    throw error;
  } finally {
    solids.reverse().forEach((solid) => solid.delete());
    sections.reverse().forEach((section) => section.delete());
  }
}

export function disposeBrickMeshes(meshes: BrickMeshes) {
  meshes.body.dispose();
  meshes.text.dispose();
  meshes.merged.dispose();
}

export function geometryToBinaryStl(geometry: THREE.BufferGeometry) {
  const mesh = new THREE.Mesh(geometry);
  const data = new STLExporter().parse(mesh, { binary: true }) as DataView;
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
}

export function layoutToBinaryStl(
  items: Array<{
    geometry: THREE.BufferGeometry;
    brick: BrickDefinition;
    x: number;
    y: number;
    rotated: boolean;
  }>,
  bedWidth: number,
  bedDepth: number,
) {
  if (!items.length) throw new Error("Empty layout");
  const geometries = items.map(({ geometry, brick, x, y, rotated }) => {
    const result = geometry.clone();
    if (rotated) result.rotateZ(Math.PI / 2);
    const width = rotated ? brick.widthMm : brick.lengthMm!;
    const depth = rotated ? brick.lengthMm! : brick.widthMm;
    return result.translate(
      x + width / 2 - bedWidth / 2,
      y + depth / 2 - bedDepth / 2,
      0,
    );
  });
  const merged = mergeGeometries(geometries);
  geometries.forEach((item) => item.dispose());
  if (!merged) throw new Error("Could not assemble plate");
  try {
    return geometryToBinaryStl(merged);
  } finally {
    merged.dispose();
  }
}

export function safeFilename(text: string) {
  const base = text
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  return base || "brick";
}
