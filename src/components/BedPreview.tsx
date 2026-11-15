import { useState } from "react";
import type {
  BrickDefinition,
  PrintBedLayout,
  ExportSettings,
  Locale,
} from "../domain/types";
export function BedPreview({
  layout,
  bricks,
  settings,
  locale = "en",
}: {
  layout: PrintBedLayout;
  bricks: BrickDefinition[];
  settings: ExportSettings;
  locale?: Locale;
}) {
  const [selected, setSelected] = useState(0);
  const plate = Math.min(selected, Math.max(0, layout.plates - 1));
  const say = (cs: string, en: string) => (locale === "cs" ? cs : en);
  if (!layout.plates)
    return (
      <div className="empty-state">
        <h3>{say("Podložka je zatím prázdná", "The print bed is empty")}</h3>
        <p>
          {say(
            "Přidejte věty v záložce Obsah. Zde se zobrazí rozmístění vašich kostek.",
            "Add sentences in Content to see your brick arrangement here.",
          )}
        </p>
      </div>
    );
  return (
    <div className="bed-preview">
      <div className="plate-navigation">
        <strong>
          {say("Podložka", "Plate")} {plate + 1} / {layout.plates}
        </strong>
        {layout.plates > 1 && (
          <div>
            <button
              aria-label={say("Předchozí podložka", "Previous plate")}
              disabled={plate === 0}
              onClick={() => setSelected(plate - 1)}
            >
              ←
            </button>
            <button
              aria-label={say("Další podložka", "Next plate")}
              disabled={plate === layout.plates - 1}
              onClick={() => setSelected(plate + 1)}
            >
              →
            </button>
          </div>
        )}
      </div>
      <svg
        className="bed"
        style={{ aspectRatio: `${settings.bedWidth}/${settings.bedDepth}` }}
        viewBox={`0 0 ${settings.bedWidth} ${settings.bedDepth}`}
        role="img"
        aria-label={say(
          `Tisková podložka ${plate + 1}, ${settings.bedWidth} × ${settings.bedDepth} mm`,
          `Print plate ${plate + 1}, ${settings.bedWidth} × ${settings.bedDepth} mm`,
        )}
      >
        <defs>
          <pattern
            id="bed-grid"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 10 0 H 0 V 10"
              fill="none"
              stroke="#d8ccea"
              strokeWidth=".35"
            />
          </pattern>
        </defs>
        <rect
          width={settings.bedWidth}
          height={settings.bedDepth}
          fill="#eee8fb"
        />
        <rect
          width={settings.bedWidth}
          height={settings.bedDepth}
          fill="url(#bed-grid)"
        />
        {layout.placed
          .filter((p) => p.plate === plate + 1)
          .map((p) => {
            const b = bricks.find((b) => b.id === p.brickId)!;
            return (
              <g key={p.instanceId}>
                <title>{`${b.text}: ${p.width} × ${p.depth} mm`}</title>
                <rect
                  x={p.x}
                  y={p.y}
                  width={p.width}
                  height={p.depth}
                  rx=".8"
                  fill={b.bodyColor}
                  stroke="#00000022"
                  strokeWidth=".3"
                />
                <text
                  x={p.x + p.width / 2}
                  y={p.y + p.depth / 2}
                  dominantBaseline="central"
                  textAnchor="middle"
                  fill={b.textColor}
                  fontFamily="system-ui,sans-serif"
                  fontSize={Math.min(
                    3.5,
                    ((p.rotated ? p.depth : p.width) /
                      Math.max(1, b.text.length)) *
                      1.35,
                  )}
                  fontWeight="600"
                  transform={
                    p.rotated
                      ? `rotate(90 ${p.x + p.width / 2} ${p.y + p.depth / 2})`
                      : undefined
                  }
                >
                  {b.text}
                </text>
              </g>
            );
          })}
      </svg>
      <div className="bed-axis">
        <span>0</span>
        <span>{settings.bedWidth} mm</span>
      </div>
      <p className="plate-count" aria-live="polite">
        {layout.placed.filter((p) => p.plate === plate + 1).length}{" "}
        {say("dílů na této podložce", "parts on this plate")}
      </p>
    </div>
  );
}
