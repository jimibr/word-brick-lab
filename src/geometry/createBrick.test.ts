import { beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { DEFAULT_GEOMETRY, type BrickDefinition } from "../domain/types";
import {
  createBrickMeshes,
  disposeBrickMeshes,
  geometryToBinaryStl,
  initializeGeometry,
  layoutToBinaryStl,
} from "./createBrick";

const make = (text = "cat", studs = 4): BrickDefinition => ({
  id: "b",
  text,
  normalized: text,
  category: "noun",
  bodyColor: "#000",
  textColor: "#fff",
  studs,
  widthMm: 15.8,
  lengthMm: 8 * studs - 0.2,
  quantity: 1,
  computedQuantity: 1,
  errors: [],
});

beforeAll(() =>
  initializeGeometry(
    createRequire(import.meta.url).resolve("manifold-3d/manifold.wasm"),
  ),
);

function inspectStl(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  expect(buffer.byteLength).toBe(84 + triangleCount * 50);
  expect(triangleCount).toBeGreaterThan(0);
  const edges = new Map<string, { count: number; direction: number }>();
  let volume = 0;

  for (let i = 0; i < triangleCount; i++) {
    const vertices = [0, 1, 2].map((index) =>
      [0, 1, 2].map((axis) =>
        view.getFloat32(84 + i * 50 + 12 + index * 12 + axis * 4, true),
      ),
    );
    const [a, b, c] = vertices as [number[], number[], number[]];
    const [ax, ay, az] = a as [number, number, number];
    const [bx, by, bz] = b as [number, number, number];
    const [cx, cy, cz] = c as [number, number, number];
    const ux = bx - ax,
      uy = by - ay,
      uz = bz - az;
    const vx = cx - ax,
      vy = cy - ay,
      vz = cz - az;
    const area = Math.hypot(
      uy * vz - uz * vy,
      uz * vx - ux * vz,
      ux * vy - uy * vx,
    );
    if (!Number.isFinite(area) || area === 0)
      throw new Error(`Invalid triangle ${i}`);
    volume +=
      (ax * (by * cz - bz * cy) +
        ay * (bz * cx - bx * cz) +
        az * (bx * cy - by * cx)) /
      6;
    const keys = vertices.map((vertex) => vertex.join(","));
    for (let j = 0; j < 3; j++) {
      const start = keys[j]!;
      const end = keys[(j + 1) % 3]!;
      const forward = start < end;
      const key = forward ? `${start}|${end}` : `${end}|${start}`;
      const edge = edges.get(key) ?? { count: 0, direction: 0 };
      edge.count++;
      edge.direction += forward ? 1 : -1;
      edges.set(key, edge);
    }
  }
  expect(
    [...edges.values()].filter(
      ({ count, direction }) => count !== 2 || direction !== 0,
    ),
  ).toEqual([]);
  expect(volume).toBeGreaterThan(0);
}

describe("brick geometry", () => {
  it.each([true, false])(
    "exports a closed brick with support tubes set to %s",
    (supportTubes) => {
      const meshes = createBrickMeshes(make(), {
        ...DEFAULT_GEOMETRY,
        supportTubes,
      });
      try {
        const positions = meshes.body.getAttribute("position");
        let hasSupportsAtBase = false;
        for (let i = 0; i < positions.count; i++) {
          if (
            positions.getZ(i) === 0 &&
            Math.abs(positions.getY(i)) < 4 &&
            Math.abs(positions.getX(i)) < 12
          ) {
            hasSupportsAtBase = true;
            break;
          }
        }
        expect(hasSupportsAtBase).toBe(supportTubes);
        inspectStl(geometryToBinaryStl(meshes.merged));
      } finally {
        disposeBrickMeshes(meshes);
      }
    },
  );

  it.each([2, 3, 4, 8, 16])("keeps nominal bounds for 2×%s", (studs) => {
    const meshes = createBrickMeshes(make("I", studs), DEFAULT_GEOMETRY);
    meshes.body.computeBoundingBox();
    const { min, max } = meshes.body.boundingBox!;
    expect(max.x - min.x).toBeCloseTo(8 * studs - 0.2, 4);
    expect(max.y - min.y).toBeCloseTo(15.8, 4);
    expect(min.z).toBeCloseTo(0, 4);
    expect(max.z).toBeCloseTo(9.6, 4);
    disposeBrickMeshes(meshes);
  });

  it.each(["I", "a", "cat", "I'm", "I've", "haven't", "?", "."])(
    "exports watertight text and body for %s",
    (text) => {
      const meshes = createBrickMeshes(make(text, 8), DEFAULT_GEOMETRY);
      meshes.text.computeBoundingBox();
      expect(meshes.text.boundingBox!.min.z).toBeCloseTo(9.6, 4);
      expect(meshes.text.boundingBox!.max.z).toBeCloseTo(10.8, 4);
      expect(meshes.exactTextWidth).toBeGreaterThan(0);
      for (const geometry of [meshes.body, meshes.text, meshes.merged])
        inspectStl(geometryToBinaryStl(geometry));
      disposeBrickMeshes(meshes);
    },
  );

  it("exports translated and rotated bricks on a plate", () => {
    const brick = make("cat");
    const meshes = createBrickMeshes(brick, DEFAULT_GEOMETRY);
    inspectStl(
      layoutToBinaryStl(
        [
          { brick, geometry: meshes.merged, x: 5, y: 5, rotated: false },
          { brick, geometry: meshes.merged, x: 50, y: 20, rotated: true },
        ],
        180,
        180,
      ),
    );
    disposeBrickMeshes(meshes);
  });
});
