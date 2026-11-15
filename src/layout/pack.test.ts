import { describe, expect, it } from "vitest";
import { pack } from "./pack";
import { DEFAULT_EXPORT, type BrickDefinition } from "../domain/types";

const brick: BrickDefinition = {
  id: "b",
  text: "cat",
  normalized: "cat",
  category: "noun",
  bodyColor: "#000",
  textColor: "#fff",
  studs: 4,
  widthMm: 15.8,
  lengthMm: 31.8,
  quantity: 25,
  computedQuantity: 25,
  errors: [],
};

describe("bed packing", () => {
  it("conserves all quantities across plates", () => {
    const result = pack([brick], {
      ...DEFAULT_EXPORT,
      bedWidth: 80,
      bedDepth: 80,
    });
    expect(result.placed).toHaveLength(25);
    expect(result.plates).toBeGreaterThan(1);
    expect(result.unplaced).toHaveLength(0);
  });

  it("is deterministic", () => {
    expect(pack([brick], DEFAULT_EXPORT)).toEqual(
      pack([brick], DEFAULT_EXPORT),
    );
  });

  it("reports oversized parts without creating a phantom plate", () => {
    const result = pack(
      [
        { ...brick, lengthMm: 95.8, quantity: 1 },
        { ...brick, id: "long", lengthMm: 103.8, quantity: 1 },
      ],
      { ...DEFAULT_EXPORT, bedWidth: 110, bedDepth: 100 },
    );
    expect(result.plates).toBe(1);
    expect(result.placed).toHaveLength(1);
    expect(result.unplaced).toEqual(["long-1"]);
  });

  it("rotates a part when both rotated dimensions fit", () => {
    const result = pack([{ ...brick, lengthMm: 103.8, quantity: 1 }], {
      ...DEFAULT_EXPORT,
      bedWidth: 110,
      bedDepth: 120,
    });
    expect(result.placed).toMatchObject([
      { rotated: true, width: 15.8, depth: 103.8 },
    ]);
  });

  it("rejects huge quantities before expanding the instances", () => {
    expect(() =>
      pack([{ ...brick, quantity: 4294967296 }], DEFAULT_EXPORT),
    ).toThrow(RangeError);
  });
});
