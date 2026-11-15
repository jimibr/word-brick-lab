const descriptions: Record<string, string> = {
  "Global font size": "Larger value → larger letters on the top.",
  "Raised text":
    "Larger value → taller letters above the top. Default: 1.2 mm.",
  "Edge margin":
    "Larger value → more space around the text; may need a longer brick.",
  "Bed width": "Larger value → wider print area for arranging parts.",
  "Bed depth": "Larger value → deeper print area for arranging parts.",
  "Wall thickness":
    "Larger value → thicker walls inward and less space for studs.",
  "Clutch clearance":
    "Larger value → looser fit. Changes support tubes, not outer walls.",
  "Tube outer diameter":
    "Larger value → wider support tubes and tighter fit between studs.",
  "Tube inner diameter":
    "Larger value → wider tube holes and thinner tube walls.",
};

/** Schematic views intentionally exaggerate dimensions to make small changes visible. */
export function SettingIllustration({
  label,
  displayLabel,
  value,
  locale = "en",
}: {
  locale?: "cs" | "en";
  label: string;
  displayLabel?: string;
  value: number;
}) {
  const say = (cs: string, en: string) => (locale === "cs" ? cs : en);
  const ring = label.includes("diameter") || label === "Clutch clearance";
  const innerDimension = label === "Tube inner diameter";
  const top = label === "Global font size" || label === "Edge margin";
  const outer = label === "Tube outer diameter" ? value * 4 : 27;
  const inner =
    label === "Tube inner diameter"
      ? value * 3.5
      : label === "Clutch clearance"
        ? 16 + value * 16
        : 17;
  const height = label === "Raised text" ? value * 10 : 12;
  return (
    <figure
      className={`setting-illustration${ring ? " setting-location" : ""}`}
    >
      <svg
        viewBox="0 0 200 92"
        role="img"
        aria-label={`${displayLabel ?? label}: ${say("schéma", "schematic")}, ${value.toLocaleString(locale)} mm`}
      >
        {ring ? (
          <>
            <rect
              x="10"
              y="18"
              width="88"
              height="48"
              rx="4"
              fill="#e9e1f4"
              stroke="#a395bb"
              strokeWidth="2"
            />
            <rect
              x="15"
              y="23"
              width="78"
              height="38"
              rx="1"
              fill="#faf7ff"
              stroke="#c8badb"
            />
            {[35, 54, 73].map((x, i) => (
              <g key={x}>
                <circle
                  cx={x}
                  cy="42"
                  r="9"
                  fill={i === 1 ? "#d9c6ff" : "#e7dcff"}
                  stroke={i === 1 ? "var(--accent)" : "#a395bb"}
                  strokeWidth={i === 1 ? 2 : 1}
                />
                <circle
                  cx={x}
                  cy="42"
                  r="5"
                  fill="white"
                  stroke={i === 1 ? "var(--accent)" : "#a395bb"}
                />
              </g>
            ))}
            <path
              d="M 54 33 L 112 12 L 132 22 M 54 51 L 112 72 L 132 62"
              fill="none"
              stroke="var(--accent)"
              strokeDasharray="3 2"
            />
            <circle
              cx="157"
              cy="42"
              r={outer}
              fill="#e7dcff"
              stroke={innerDimension ? "#a395bb" : "var(--accent)"}
              strokeWidth={innerDimension ? 1 : 3}
            />
            <circle
              cx="157"
              cy="42"
              r={inner}
              fill="white"
              stroke={innerDimension ? "var(--accent)" : "#a395bb"}
              strokeWidth={innerDimension ? 3 : 1}
            />
            <path
              d={`M ${157 - (innerDimension ? inner : outer)} 42 H ${157 + (innerDimension ? inner : outer)}`}
              stroke="var(--accent)"
              strokeWidth="2"
            />
            <path
              d={`M ${157 - (innerDimension ? inner : outer)} 38 V 46 M ${157 + (innerDimension ? inner : outer)} 38 V 46`}
              stroke="var(--accent)"
              strokeWidth="2"
            />
            <text x="54" y="81" textAnchor="middle">
              {say("Vnitřní trubičky", "Internal support tubes")}
            </text>
            <text x="157" y="81" textAnchor="middle">
              {innerDimension
                ? say("Vnitřní průměr", "Inner diameter")
                : say("Vnější průměr", "Outer diameter")}
            </text>
            <text x="100" y="91" textAnchor="middle">
              {say("Spodní strana → detail", "Underside → enlarged detail")}
            </text>
          </>
        ) : label === "Bed width" || label === "Bed depth" ? (
          <>
            <rect
              x={100 - value * 0.12}
              y="10"
              width={value * 0.24}
              height="56"
              rx="3"
              fill="#f3edff"
              stroke="var(--accent)"
              strokeWidth="2"
            />
            {[80, 104].map((x) => (
              <rect
                key={x}
                x={x}
                y="24"
                width="17"
                height="25"
                rx="2"
                fill="#bfa7ed"
              />
            ))}
            <text x="100" y="85" textAnchor="middle">
              {label === "Bed depth"
                ? say("↕ Hloubka tiskové plochy", "↕ Print area depth")
                : say("← Šířka tiskové plochy →", "← Print area width →")}
            </text>
          </>
        ) : top ? (
          <>
            <rect
              x="20"
              y="12"
              width="160"
              height="54"
              rx="5"
              fill="#f3edff"
              stroke="#a395bb"
            />
            <rect
              x={label === "Edge margin" ? 20 + value * 5 : 30}
              y="20"
              width={label === "Edge margin" ? 160 - value * 10 : 140}
              height="38"
              rx="2"
              fill="none"
              stroke="var(--accent)"
              strokeDasharray="4 3"
            />
            <text
              x="100"
              y="48"
              textAnchor="middle"
              fill="var(--accent)"
              style={{
                fontSize: label === "Global font size" ? value * 3 : 22,
                fontWeight: 700,
              }}
            >
              Word
            </text>
            <text x="100" y="85" textAnchor="middle">
              {say("Pohled shora · text", "Top view · text area")}
            </text>
          </>
        ) : (
          <>
            <path
              d="M 25 68 V 35 H 175 V 68"
              fill="none"
              stroke="#a395bb"
              strokeWidth="5"
            />
            {label === "Wall thickness" && (
              <path
                d="M 30 68 V 40 H 170 V 68"
                fill="none"
                stroke="var(--accent)"
                strokeWidth={value * 4}
              />
            )}
            <rect
              x="70"
              y={32 - height}
              width="60"
              height={height}
              fill={label === "Raised text" ? "var(--accent)" : "#bfa7ed"}
            />
            <text x="100" y="87" textAnchor="middle">
              {say("Boční řez", "Side cross-section")}
            </text>
          </>
        )}
      </svg>
      <figcaption>
        {locale === "cs"
          ? {
              "Global font size": "Větší hodnota zvětší písmo na horní ploše.",
              "Raised text":
                "Větší hodnota zvýší vystouplý text. Výchozí výška je 1,2 mm.",
              "Edge margin": "Větší okraj může vyžadovat delší kostku.",
              "Bed width": "Šířka plochy pro rozmístění dílů.",
              "Wall thickness": "Silnější stěny zmenší vnitřní prostor.",
              "Clutch clearance": "Větší vůle znamená volnější spoj.",
              "Tube outer diameter":
                "Větší trubička znamená těsnější spoj mezi výstupky.",
              "Tube inner diameter": "Větší otvor ztenčí stěnu trubičky.",
              "Bed depth": "Hloubka plochy pro rozmístění dílů.",
            }[label]
          : descriptions[label]}{" "}
        <span>
          {say("Schéma není v měřítku.", "Illustration, not to scale.")}
        </span>
      </figcaption>
    </figure>
  );
}
