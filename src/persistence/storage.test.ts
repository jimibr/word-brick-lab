import { describe, expect, it } from "vitest";
import { loadProject, parseProject } from "./storage";
import { fromKit } from "../domain/project";
describe("project JSON", () => {
  it("roundtrips versioned editable state", () => {
    const p = fromKit("to-be");
    p.geometry.supportTubes = false;
    expect(parseProject(JSON.stringify(p))).toEqual(p);
  });
  it("migrates v1 geometry to classic bricks", () => {
    const p = fromKit("to-be");
    const old = {
      ...p,
      schemaVersion: 1,
      geometry: {
        fontSize: 7,
        textHeight: 0.6,
        edgeMargin: 2,
        wallThickness: 1.5,
        topThickness: 1.4,
        tubeOuterDiameter: 6.5,
        tubeInnerDiameter: 4.8,
        clutchClearance: 0.15,
        xyCompensation: 0,
        edgeRadius: 0.35,
      },
    };
    const migrated = parseProject(JSON.stringify(old));
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.geometry.construction).toBe("fullBrick");
    expect(migrated.geometry.supportTubes).toBe(true);
  });
  it("opens legacy tile projects as classic bricks from files and autosave", () => {
    const project = fromKit("to-be");
    const raw = JSON.stringify({
      ...project,
      geometry: {
        ...project.geometry,
        construction: "snapTile",
        tileHeight: 3.2,
        socketDepth: 1.8,
        socketOuterDiameter: 6.6,
      },
    });
    expect(parseProject(raw)).toEqual(project);

    const key = "wordbricklab.project.v1";
    localStorage.setItem(key, raw);
    try {
      const restored = loadProject();
      expect(restored?.geometry).toEqual(project.geometry);
      expect(restored?.sentences.map(({ text }) => text)).toEqual(
        project.sentences.map(({ text }) => text),
      );
    } finally {
      localStorage.removeItem(key);
    }
  });
  it("rejects corrupt JSON", () => expect(() => parseProject("{no")).toThrow());
  it("rejects unknown versions", () => {
    const p = { ...fromKit("to-be"), schemaVersion: 99 };
    expect(() => parseProject(JSON.stringify(p))).toThrow();
  });
});

it("rejects malformed nested project data and unsafe manual quantities", () => {
  const project = fromKit("to-be");
  const malformed = {
    ...project,
    sentences: [{ ...project.sentences[0], text: 123 }],
  };
  const unsafe = {
    ...project,
    bricks: project.bricks.map((brick) => ({
      ...brick,
      manualQuantity: 4294967296,
    })),
  };
  expect(() => parseProject(JSON.stringify(malformed))).toThrow();
  expect(() => parseProject(JSON.stringify(unsafe))).toThrow();
});

it("rejects invalid settings and duplicate brick identifiers", () => {
  const project = fromKit("to-be");
  expect(() =>
    parseProject(JSON.stringify({ ...project, export: { gap: -1 } })),
  ).toThrow();
  expect(() =>
    parseProject(
      JSON.stringify({
        ...project,
        bricks: [project.bricks[0], project.bricks[0]],
      }),
    ),
  ).toThrow();
});
