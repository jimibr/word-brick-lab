import type {
  BrickDefinition,
  ExportSettings,
  PlacedBrick,
  PrintBedLayout,
} from "../domain/types";
import { MAX_PROJECT_PIECES } from "../domain/limits";

export function pack(
  bricks: BrickDefinition[],
  settings: ExportSettings,
): PrintBedLayout {
  const total = bricks.reduce((sum, brick) => {
    if (!Number.isSafeInteger(brick.quantity) || brick.quantity < 0) {
      throw new RangeError("Invalid brick quantity");
    }
    return sum + brick.quantity;
  }, 0);
  if (total > MAX_PROJECT_PIECES) throw new RangeError("Too many pieces");

  const { bedMargin: margin, gap, allowRotation } = settings;
  const width = settings.bedWidth - 2 * margin;
  const depth = settings.bedDepth - 2 * margin;
  const placed: PlacedBrick[] = [];
  const unplaced: string[] = [];
  let plate = 1;
  let x = 0;
  let y = 0;
  let rowDepth = 0;

  for (const brick of bricks) {
    const length = brick.lengthMm ?? Infinity;
    const rotated =
      allowRotation &&
      (length > width || brick.widthMm > depth) &&
      brick.widthMm <= width &&
      length <= depth;
    const w = rotated ? brick.widthMm : length;
    const d = rotated ? length : brick.widthMm;

    for (let i = 1; i <= brick.quantity; i++) {
      const instanceId = `${brick.id}-${i}`;
      if (brick.errors.length || w > width || d > depth) {
        unplaced.push(instanceId);
        continue;
      }
      if (x + w > width) {
        x = 0;
        y += rowDepth + gap;
        rowDepth = 0;
      }
      if (y + d > depth) {
        plate++;
        x = 0;
        y = 0;
        rowDepth = 0;
      }
      placed.push({
        instanceId,
        brickId: brick.id,
        plate,
        x: x + margin,
        y: y + margin,
        width: w,
        depth: d,
        rotated,
      });
      x += w + gap;
      rowDepth = Math.max(rowDepth, d);
    }
  }

  return { plates: placed.length ? plate : 0, placed, unplaced };
}
