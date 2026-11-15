import { useEffect, useMemo, useRef, useState } from "react";
import type { BrickDefinition, Project } from "./domain/types";
import {
  DEFAULT_GEOMETRY,
  DEFAULT_EXPORT,
  CATEGORY_COLORS,
} from "./domain/types";
import { emptyProject, fromKit, refresh, sentence } from "./domain/project";
import { KITS } from "./domain/kits";
import {
  MAX_PROJECT_FILE_BYTES,
  MAX_PROJECT_PIECES,
  MAX_PROJECT_TEXT,
} from "./domain/limits";
import { pack } from "./layout/pack";
import { t } from "./i18n";
import {
  clearLocalProject,
  enableLocalSaving,
  loadProject,
  localSavingEnabled,
  saveProject,
  parseProject,
  downloadBlob,
} from "./persistence/storage";
import { BrickPreview } from "./components/BrickPreview";
import { BedPreview } from "./components/BedPreview";

import { safeFilename } from "./geometry/createBrick";
import { BODY_HEIGHT } from "./geometry/dimensions";
import type { GeometryRequest, GeometryResponse } from "./workers/protocol";
import { SettingIllustration } from "./components/SettingIllustration";
import "./styles.css";

const cats = [
  "pronoun",
  "verb",
  "article",
  "noun",
  "adjective",
  "punctuation",
  "other",
] as const;

function App() {
  const [saving, setSaving] = useState(localSavingEnabled);
  const [project, setProject] = useState<Project>(() => {
    const saved = saving ? loadProject() : null;
    if (saved) return saved;
    const initial = { ...emptyProject(), locale: "cs" as const };
    return contentProject(initial, "I am ready.\nYou are at home.");
  });
  const [draft, setDraft] = useState(() =>
    project.sentences.map((s) => s.text).join("\n"),
  );
  const [step, setStep] = useState(() =>
    window.location.hash === "#bed-dimensions" ? 4 : 1,
  );
  useEffect(() => {
    const openBedSettings = () => {
      if (window.location.hash === "#bed-dimensions") setStep(4);
    };
    window.addEventListener("hashchange", openBedSettings);
    return () => window.removeEventListener("hashchange", openBedSettings);
  }, []);
  useEffect(() => {
    if (step !== 4 || window.location.hash !== "#bed-dimensions") return;
    const heading = document.getElementById("bed-dimensions");
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView();
  }, [step]);
  const [source, setSource] = useState<"sentences" | "kit">(() =>
    project.kitId ? "kit" : "sentences",
  );
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [privacyNotice, setPrivacyNotice] = useState("");
  const privacyDialog = useRef<HTMLDialogElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const locale = project.locale;
  useEffect(() => {
    const stopIfCleared = () => {
      if (!localSavingEnabled()) setSaving(false);
    };
    window.addEventListener("storage", stopIfCleared);
    return () => window.removeEventListener("storage", stopIfCleared);
  }, []);
  useEffect(() => {
    if (!saving || !localSavingEnabled() || saveProject(project)) return;
    const timer = setTimeout(
      () =>
        setNotice(
          project.locale === "cs"
            ? "Projekt se nepodařilo automaticky uložit."
            : "The project could not be autosaved.",
        ),
      0,
    );
    return () => clearTimeout(timer);
  }, [project, saving]);
  useEffect(() => {
    if (source !== "sentences") return;
    const timer = setTimeout(
      () => setProject((p) => contentProject(p, draft)),
      350,
    );
    return () => clearTimeout(timer);
  }, [draft, source]);
  const say = (cs: string, en: string) => (locale === "cs" ? cs : en);
  function startLocalSaving() {
    const current =
      source === "sentences" ? contentProject(project, draft) : project;
    if (
      loadProject() &&
      !window.confirm(
        say(
          "Nahradit dříve uložený projekt právě otevřeným projektem?",
          "Replace the previously saved project with the current project?",
        ),
      )
    )
      return;
    if (enableLocalSaving(current)) {
      setProject(current);
      setSaving(true);
      setPrivacyNotice("");
    } else {
      setPrivacyNotice(
        say(
          "Ukládání se nepodařilo zapnout.",
          "Could not enable local saving.",
        ),
      );
    }
  }
  function restoreLocalProject() {
    const saved = loadProject();
    if (!saved) {
      setPrivacyNotice(
        say(
          "Uložený projekt se nepodařilo najít.",
          "No saved project was found.",
        ),
      );
      return;
    }
    setProject(saved);
    setDraft(saved.sentences.map((sentence) => sentence.text).join("\n"));
    setSource(saved.kitId ? "kit" : "sentences");
    setSelected(undefined);
    setStep(1);
    privacyDialog.current?.close();
  }
  function stopLocalSaving() {
    setSaving(false);
    setPrivacyNotice(
      clearLocalProject()
        ? say(
            "Místní uložení bylo smazáno.",
            "The locally saved project was deleted.",
          )
        : say(
            "Místní uložení se nepodařilo smazat.",
            "Could not delete the locally saved project.",
          ),
    );
  }
  const { valid, layout, total } = useMemo(() => {
    const valid = project.bricks.filter(
      (b) => !b.errors.length && b.quantity > 0,
    );
    const total = valid.reduce((sum, b) => sum + b.quantity, 0);
    const layout =
      total <= MAX_PROJECT_PIECES
        ? pack(valid, project.export)
        : { plates: 0, placed: [], unplaced: [] };
    return { valid, layout, total };
  }, [project.bricks, project.export]);
  const unplacedIds = new Set(
    layout.unplaced.map((id) => id.slice(0, id.lastIndexOf("-"))),
  );
  const unplacedWords = valid
    .filter((brick) => unplacedIds.has(brick.id))
    .map((brick) => brick.text);
  const overPieceLimit = total > MAX_PROJECT_PIECES;
  const active =
    project.bricks.find((b) => b.id === selected) ??
    valid.find(
      (b) =>
        b.normalized ===
        project.sentences
          .find((s) => s.enabled)
          ?.tokens.find((t) => t.category !== "punctuation")?.normalized,
    ) ??
    valid.find((b) => b.category !== "punctuation") ??
    valid[0];
  const modelHeight = BODY_HEIGHT;
  const update = (patch: Partial<Project>) =>
    setProject((p) => refresh({ ...p, ...patch }));
  function chooseKit(id: string) {
    const p = fromKit(id, {
      ...emptyProject(),
      locale: project.locale,
      geometry: { ...project.geometry },
      export: { ...project.export },
    });
    setProject(p);
    setDraft(p.sentences.map((s) => s.text).join("\n"));
    setSelected(undefined);
  }
  function applyDraft() {
    setProject((p) => contentProject(p, draft));
    setStep(2);
  }
  function editSentence(id: string, text: string) {
    setProject((p) =>
      refresh({
        ...p,
        sentences: p.sentences.map((s) => (s.id === id ? { ...s, text } : s)),
      }),
    );
  }
  function editBrick(id: string, patch: Partial<BrickDefinition>) {
    setProject((p) => ({
      ...p,
      bricks: p.bricks.map((b) =>
        b.id === id
          ? {
              ...b,
              ...patch,
              ...(patch.category
                ? { bodyColor: CATEGORY_COLORS[patch.category] }
                : {}),
              quantity:
                patch.manualQuantity ?? b.manualQuantity ?? b.computedQuantity,
            }
          : b,
      ),
    }));
  }
  useEffect(() => () => workerRef.current?.terminate(), []);

  function stopExport() {
    workerRef.current?.terminate();
    workerRef.current = null;
    setBusy(null);
  }

  function runExport(request: GeometryRequest, filename: string, mime: string) {
    if (workerRef.current) return;
    try {
      const worker = new Worker(
        new URL("./workers/geometry.worker.ts", import.meta.url),
        { type: "module" },
      );
      workerRef.current = worker;
      setBusy({
        done: 0,
        total:
          request.type === "zip"
            ? request.bricks.length + request.layout.plates + 1
            : 1,
      });
      setNotice("");
      const fail = (message: string) => {
        if (workerRef.current !== worker) return;
        stopExport();
        setNotice(message);
      };
      worker.onerror = (event) => {
        event.preventDefault();
        fail(
          event.message ||
            say("Export se nepodařilo spustit.", "Could not start export."),
        );
      };
      worker.onmessageerror = () =>
        fail(
          say("Export vrátil neplatná data.", "Export returned invalid data."),
        );
      worker.onmessage = ({ data }: MessageEvent<GeometryResponse>) => {
        if (workerRef.current !== worker) return;
        if (data.type === "progress") {
          setBusy({ done: data.done, total: data.total });
        } else if (data.type === "error") {
          fail(data.message);
        } else {
          stopExport();
          downloadBlob(new Blob([data.file], { type: mime }), filename);
        }
      };
      worker.postMessage(request);
    } catch (error) {
      stopExport();
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }

  function downloadOne() {
    if (!active || active.errors.length || !active.quantity) return;
    runExport(
      { type: "single", brick: active, settings: project.geometry },
      `${safeFilename(active.text)}-brick-2x${active.studs}.stl`,
      "model/stl",
    );
  }

  function downloadZip() {
    if (
      !valid.length ||
      errors.length ||
      overPieceLimit ||
      layout.unplaced.length
    )
      return;
    runExport(
      {
        type: "zip",
        bricks: valid,
        settings: project.geometry,
        options: project.export,
        layout,
      },
      "wordbricklab-export.zip",
      "application/zip",
    );
  }

  function exportJson() {
    downloadBlob(
      new Blob([JSON.stringify(project, null, 2)], {
        type: "application/json",
      }),
      `${safeFilename(project.name)}.wordbrick.json`,
    );
  }
  async function importJson(file: File) {
    try {
      if (file.size > MAX_PROJECT_FILE_BYTES) {
        throw new Error(
          say("Soubor projektu je příliš velký.", "Project file is too large."),
        );
      }
      const p = refresh(parseProject(await file.text()));
      if (
        p.bricks.reduce((sum, brick) => sum + brick.quantity, 0) >
        MAX_PROJECT_PIECES
      ) {
        throw new Error(
          say("Projekt má příliš mnoho kusů.", "Project has too many pieces."),
        );
      }
      setProject(p);
      setSelected(undefined);
      setDraft(p.sentences.map((s) => s.text).join("\n"));
      setSource(p.kitId ? "kit" : "sentences");
      setNotice(say("Projekt byl načten.", "Project imported."));
    } catch (e) {
      setNotice(
        `${say("Projekt se nepodařilo načíst", "Import failed")}: ${e instanceof Error ? e.message : "invalid project"}`,
      );
    }
  }
  function navigateTo(next: number) {
    if (window.location.hash === "#bed-dimensions") {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
    if (step === 1 && next !== 1 && source === "sentences") applyDraft();
    if (next === 1 && step !== 1) {
      setDraft(project.sentences.map((s) => s.text).join("\n"));
      setSource(project.kitId ? "kit" : "sentences");
    }
    setStep(next);

    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const categoryName = (category: BrickDefinition["category"]) =>
    locale === "cs"
      ? {
          pronoun: "Zájmeno",
          verb: "Sloveso",
          article: "Člen",
          noun: "Podstatné jméno",
          adjective: "Přídavné jméno",
          punctuation: "Interpunkce",
          other: "Ostatní",
        }[category]
      : category;
  const errors = project.bricks.filter((b) => b.errors.length);
  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            W
          </span>
          <div>
            <h1>
              WordBrick<span className="brand-lab">Lab</span>
            </h1>
            <p>{say("Slova, která můžete postavit", "Words you can build")}</p>
          </div>
        </div>
        <div className="header-actions">
          {saving && (
            <span className="autosave">
              {say("Ukládá se v tomto zařízení", "Saved on this device")}
            </span>
          )}
          <button
            type="button"
            className="locale"
            onClick={() => {
              setPrivacyNotice("");
              privacyDialog.current?.showModal();
            }}
          >
            {say("Soukromí", "Privacy")}
          </button>
          <button
            className="locale"
            onClick={() =>
              setProject((p) => ({
                ...p,
                locale: p.locale === "cs" ? "en" : "cs",
              }))
            }
          >
            {locale === "cs" ? "EN" : "CZ"}
          </button>
        </div>
      </header>
      <div className="navigation">
        <nav aria-label={say("Hlavní navigace", "Main navigation")}>
          {[
            say("Obsah", "Content"),
            say("Kostky", "Bricks"),
            say("Tisk a export", "Print & export"),
            say("Nastavení", "Settings"),
          ].map((label, i) => (
            <button
              key={i}
              aria-current={step === i + 1 ? "page" : undefined}
              onClick={() => navigateTo(i + 1)}
            >
              {label}
              {i === 1 && project.bricks.length > 0 && (
                <span className="nav-count">{project.bricks.length}</span>
              )}
            </button>
          ))}
        </nav>
        <span className="project-summary">
          {say("Název projektu", "Project name")}:{" "}
          <strong>{project.name}</strong>
        </span>
      </div>
      <main>
        <div className={step === 1 ? "page-heading mission" : "page-heading"}>
          <div>
            <h2>
              {step === 1
                ? say("Proměňte slova v kostky", "Turn words into bricks")
                : step === 2
                  ? say("Vaše kostky", "Your bricks")
                  : step === 3
                    ? say(
                        "Připraveno pro vaši tiskárnu",
                        "Ready for your printer",
                      )
                    : say(
                        "Každý detail pod kontrolou",
                        "Every detail under control",
                      )}
            </h2>
            <p>
              {step === 1
                ? say(
                    "Napište větu a připravte si slovní kostky pro 3D tisk. Poskládejte z nich věty na procvičování jazyků nebo vlastní vzkaz pro radost.",
                    "Write a sentence and make word bricks to 3D print. Use them to practise a language or leave a playful message.",
                  )
                : step === 2
                  ? say(
                      "Vyberte slovo, prohlédněte si model a upravte počet kusů.",
                      "Select a word, inspect the model and adjust quantities.",
                    )
                  : step === 3
                    ? say(
                        "Zkontrolujte rozložení a stáhněte celou sadu najednou.",
                        "Review the arrangement and download your complete set.",
                      )
                    : say(
                        "Všechna nastavení jsou dostupná rovnou. Hodnoty jsou v milimetrech.",
                        "All settings are available here. Values are in millimetres.",
                      )}
            </p>
          </div>
          {step === 1 && (
            <div className="mission-examples">
              <div className="mission-example">
                <p>{say("Na procvičování", "For language practice")}</p>
                <div className="mission-words">
                  <span>I</span>
                  <span>have</span>
                  <span>a</span>
                  <span>cat.</span>
                </div>
              </div>
              <div className="mission-example">
                <p>{say("Na vzkazy", "For messages")}</p>
                <div className="mission-words mission-words--message">
                  <span>{say("Mám", "You")}</span>
                  <span>{say("tě", "are")}</span>
                  <span>{say("rád!", "amazing!")}</span>
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <button className="primary" onClick={() => navigateTo(3)}>
              {say("Připravit k tisku", "Prepare for printing")}
            </button>
          )}
        </div>
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button
              onClick={() => setNotice("")}
              aria-label={say("Zavřít oznámení", "Dismiss notification")}
            >
              ×
            </button>
          </div>
        )}
        {step === 1 && (
          <div className="content-screen">
            <section className="content-editor surface">
              <div
                className="source-tabs"
                aria-label={say("Zdroj vět", "Sentence source")}
              >
                <button
                  aria-pressed={source === "sentences"}
                  onClick={() => {
                    if (source === "kit" && project.kitId)
                      setDraft(project.sentences.map((s) => s.text).join("\n"));
                    setSource("sentences");
                  }}
                >
                  {say("Vlastní věty", "Your sentences")}
                </button>
                <button
                  aria-pressed={source === "kit"}
                  onClick={() => setSource("kit")}
                >
                  {say("Připravená sada", "Ready-made set")}
                </button>
              </div>
              {source === "sentences" ? (
                <label className="draft-label">
                  {say(
                    "Co chcete procvičovat?",
                    "What would you like to practise?",
                  )}
                  <textarea
                    aria-label={say("Věty", "Sentences")}
                    value={draft}
                    maxLength={MAX_PROJECT_TEXT}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={6}
                  />
                  <span className="field-hint">
                    {say(
                      "Každou větu napište na nový řádek. Náhled se průběžně aktualizuje.",
                      "One sentence per line. The preview updates as you type.",
                    )}
                  </span>
                </label>
              ) : (
                <div className="kit-editor">
                  <div className="kit-row">
                    {KITS.map((k) => (
                      <button
                        key={k.id}
                        aria-pressed={project.kitId === k.id}
                        onClick={() => chooseKit(k.id)}
                      >
                        <strong>
                          {t(locale, k.id === "to-be" ? "toBe" : "haveGot")}
                        </strong>
                        <span>
                          {k.id === "to-be"
                            ? "I am / You are / He is"
                            : "I have got / You have got"}
                        </span>
                      </button>
                    ))}
                  </div>
                  {project.sentences.length > 0 && (
                    <div className="sentence-list">
                      <h3>{say("Věty v sadě", "Sentences in this set")}</h3>
                      {project.sentences.map((sentence, i) => (
                        <div className="sentence" key={sentence.id}>
                          <input
                            aria-label={say(
                              `Použít větu ${i + 1}`,
                              `Include sentence ${i + 1}`,
                            )}
                            type="checkbox"
                            checked={sentence.enabled}
                            onChange={(e) =>
                              setProject((p) =>
                                refresh({
                                  ...p,
                                  sentences: p.sentences.map((s) =>
                                    s.id === sentence.id
                                      ? { ...s, enabled: e.target.checked }
                                      : s,
                                  ),
                                }),
                              )
                            }
                          />
                          <input
                            aria-label={say(
                              `Věta ${i + 1}`,
                              `Sentence ${i + 1}`,
                            )}
                            value={sentence.text}
                            maxLength={Math.max(
                              0,
                              MAX_PROJECT_TEXT -
                                project.sentences.reduce(
                                  (sum, s) =>
                                    sum +
                                    (s.id === sentence.id
                                      ? 0
                                      : s.text.length + 1),
                                  0,
                                ),
                            )}
                            onChange={(e) =>
                              editSentence(sentence.id, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="content-rules">
                <h3>{say("Jak sestavit sadu", "How to build the set")}</h3>
                <label>
                  {say("Počítání kusů", "Quantity mode")}
                  <select
                    value={project.quantityMode}
                    onChange={(e) =>
                      update({
                        quantityMode: e.target.value as Project["quantityMode"],
                      })
                    }
                  >
                    <option value="reusable">{t(locale, "reusable")}</option>
                    <option value="simultaneous">
                      {t(locale, "simultaneous")}
                    </option>
                  </select>
                  <small>
                    {say(
                      "Opakovaně použitelná sada vystačí na jednu větu. Současný režim vytvoří dost kusů pro všechny věty.",
                      "A reusable set covers one sentence at a time. Simultaneous mode provides enough pieces for all sentences.",
                    )}
                  </small>
                </label>
                <div className="rule-pair">
                  <label>
                    {say("Interpunkce", "Punctuation")}
                    <select
                      value={project.punctuationMode}
                      onChange={(e) =>
                        update({
                          punctuationMode: e.target
                            .value as Project["punctuationMode"],
                        })
                      }
                    >
                      <option value="separate">{t(locale, "separate")}</option>
                      <option value="attached">{t(locale, "attached")}</option>
                    </select>
                  </label>
                  <label>
                    {say("Stažené tvary", "Contractions")}
                    <select
                      value={project.contractionMode}
                      onChange={(e) =>
                        update({
                          contractionMode: e.target
                            .value as Project["contractionMode"],
                        })
                      }
                    >
                      <option value="whole">{t(locale, "whole")}</option>
                      <option value="segmented">
                        {t(locale, "segmented")}
                      </option>
                    </select>
                  </label>
                </div>
              </div>
              <button
                className="primary"
                disabled={source === "kit" ? !project.kitId : !draft.trim()}
                onClick={() =>
                  source === "sentences" ? applyDraft() : navigateTo(2)
                }
              >
                {say("Prohlédnout kostky", "Review bricks")}
              </button>
            </section>
            <section className="live-preview surface">
              <div className="panel-heading preview-heading">
                <h3>{say("Vaše věty ve 3D", "Your sentences in 3D")}</h3>
              </div>
              <BrickPreview
                bricks={project.bricks.filter(
                  (b) => !b.errors.length && b.quantity > 0,
                )}
                settings={project.geometry}
                locale={locale}
              />
              <div className="preview-caption" aria-live="polite">
                <strong>{project.bricks.length}</strong>{" "}
                {say("různých kostek", "unique bricks")}
                <span>
                  {say("Skutečná geometrie pro tisk", "Actual print geometry")}
                </span>
              </div>
              <div className="category-legend">
                {(["pronoun", "verb", "noun", "other"] as const).map((c) => (
                  <span key={c}>
                    <i style={{ background: CATEGORY_COLORS[c] }} />
                    {categoryName(c)}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}
        {step === 2 && (
          <div className="brick-screen">
            <section className="brick-list surface">
              <div className="panel-heading">
                <h3>{say("Seznam kostek", "Brick list")}</h3>
                <span>
                  {project.bricks.length}{" "}
                  {say("slov a znamének", "words and symbols")}
                </span>
              </div>
              {!project.bricks.length ? (
                <div className="empty-state">
                  <h3>
                    {say("Zatím tu nejsou žádné kostky", "No bricks yet")}
                  </h3>
                  <p>
                    {say(
                      "Přidejte věty nebo vyberte připravenou sadu.",
                      "Add sentences or choose a ready-made set.",
                    )}
                  </p>
                  <button onClick={() => navigateTo(1)}>
                    {say("Zadat obsah", "Add content")}
                  </button>
                </div>
              ) : (
                <div className="brick-table">
                  <div className="table-head">
                    <span>{say("Slovo / kategorie", "Word / category")}</span>
                    <span>{say("Rozměr", "Size")}</span>
                    <span>{say("Počet", "Quantity")}</span>
                  </div>
                  {project.bricks.map((b) => (
                    <div
                      className={`brick-row ${active?.id === b.id ? "selected" : ""} ${b.errors.length ? "invalid" : ""}`}
                      key={b.id}
                    >
                      <button
                        className="word-choice"
                        aria-pressed={active?.id === b.id}
                        onClick={() => setSelected(b.id)}
                      >
                        <i style={{ background: b.bodyColor }} />
                        <span>
                          <strong>{b.text}</strong>
                          <small>{categoryName(b.category)}</small>
                        </span>
                      </button>
                      <span className="row-size">
                        {b.studs ? `2 × ${b.studs}` : "—"}
                        <small>
                          {b.lengthMm
                            ? `${b.lengthMm.toLocaleString(locale)} mm`
                            : say("Příliš dlouhé", "Too long")}
                        </small>
                      </span>
                      <label className="qty">
                        <span className="sr-only">
                          {say("Počet", "Quantity")}: {b.text}
                        </span>
                        <input
                          aria-label={`${say("Počet", "Quantity")}: ${b.text}`}
                          type="number"
                          min={0}
                          max={MAX_PROJECT_PIECES}
                          step={1}
                          value={b.quantity}
                          onChange={(e) =>
                            editBrick(b.id, {
                              manualQuantity: Math.max(
                                0,
                                Math.min(
                                  MAX_PROJECT_PIECES,
                                  Math.floor(Number(e.target.value)),
                                ),
                              ),
                            })
                          }
                        />
                      </label>
                      {b.errors.length > 0 && (
                        <p className="row-error" role="alert">
                          {b.errors.join(" ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="brick-detail surface">
              <div className="panel-heading preview-heading">
                <div>
                  <p className="detail-label">
                    {say("Vybraná kostka", "Selected brick")}
                  </p>
                  <h3>
                    {active?.text ?? say("Vyberte kostku", "Select a brick")}
                  </h3>
                </div>
              </div>
              <BrickPreview
                brick={active}
                settings={project.geometry}
                locale={locale}
              />
              {active && (
                <div className="detail-controls">
                  <div className="dimension-line">
                    <span>{say("Rozměry modelu", "Model dimensions")}</span>
                    <strong>
                      {[
                        active.lengthMm,
                        active.widthMm,
                        modelHeight + project.geometry.textHeight,
                      ]
                        .map(
                          (n) =>
                            n?.toLocaleString(locale, {
                              maximumFractionDigits: 2,
                            }) ?? "—",
                        )
                        .join(" × ")}{" "}
                      mm
                    </strong>
                  </div>
                  <label>
                    {say("Slovní druh a barva", "Word class and colour")}
                    <select
                      aria-label={`${say("Slovní druh", "Category")}: ${active.text}`}
                      value={active.category}
                      onChange={(e) =>
                        editBrick(active.id, {
                          category: e.target
                            .value as BrickDefinition["category"],
                        })
                      }
                    >
                      {cats.map((c) => (
                        <option value={c} key={c}>
                          {categoryName(c)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="detail-note">
                    <button
                      className="text-button"
                      onClick={() => navigateTo(4)}
                    >
                      {say("Změnit parametry", "Change parameters")}
                    </button>
                  </div>
                  {active.manualQuantity !== undefined && (
                    <button
                      className="text-button"
                      onClick={() =>
                        setProject((p) => ({
                          ...p,
                          bricks: p.bricks.map((b) =>
                            b.id === active.id
                              ? {
                                  ...b,
                                  manualQuantity: undefined,
                                  quantity: b.computedQuantity,
                                }
                              : b,
                          ),
                        }))
                      }
                    >
                      {say(
                        `Obnovit vypočtený počet (${active.computedQuantity})`,
                        `Restore calculated quantity (${active.computedQuantity})`,
                      )}
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
        {step === 3 && (
          <div className="print-screen">
            <section className="print-layout surface">
              <div className="panel-heading preview-heading">
                <div>
                  <h3>{t(locale, "layout")}</h3>
                  <p className="detail-label">
                    {project.export.bedWidth} × {project.export.bedDepth} mm
                  </p>
                </div>
              </div>
              <BedPreview
                layout={layout}
                bricks={project.bricks}
                settings={project.export}
                locale={locale}
              />
              <div className="print-caption">
                {say(
                  "Rozložení odpovídá souborům podložek v ZIP archivu.",
                  "This arrangement matches the plate files in the ZIP archive.",
                )}
                <a className="text-button" href="#bed-dimensions">
                  {say("Rozměry podložky", "Bed dimensions")}
                </a>
              </div>
            </section>
            <section className="export-panel surface">
              <h3>{say("Stáhnout tiskové soubory", "Download print files")}</h3>
              <dl className="export-summary">
                <div>
                  <dt>{say("Různých kostek", "Unique bricks")}</dt>
                  <dd>{valid.length}</dd>
                </div>
                <div>
                  <dt>{say("Kusů celkem", "Total pieces")}</dt>
                  <dd>{total}</dd>
                </div>
                <div>
                  <dt>{say("Tiskových podložek", "Print plates")}</dt>
                  <dd>{layout.plates}</dd>
                </div>
              </dl>
              {overPieceLimit && (
                <div className="warning" role="alert">
                  {say(
                    `Sada překračuje limit ${MAX_PROJECT_PIECES} kusů. Snižte počty nebo rozdělte sadu.`,
                    `The set exceeds the ${MAX_PROJECT_PIECES}-piece limit. Reduce quantities or split the set.`,
                  )}
                  <button onClick={() => navigateTo(2)}>
                    {say("Upravit počty", "Edit quantities")}
                  </button>
                </div>
              )}
              {unplacedWords.length > 0 && (
                <div className="warning" role="alert">
                  {say(
                    "Na tiskovou podložku se nevejdou",
                    "These parts do not fit the print bed",
                  )}
                  {": "}
                  {unplacedWords.join(", ")}
                  <button onClick={() => navigateTo(4)}>
                    {say("Upravit podložku", "Edit bed size")}
                  </button>
                </div>
              )}
              {errors.length > 0 && (
                <div className="warning" role="alert">
                  {say(
                    "Některá slova se nevejdou na kostku. Opravte je před stažením celé sady.",
                    "Some words do not fit a brick. Fix them before downloading the set.",
                  )}
                  <button onClick={() => navigateTo(2)}>
                    {say("Zkontrolovat kostky", "Review bricks")}
                  </button>
                </div>
              )}
              <label className="check">
                <input
                  type="checkbox"
                  checked={project.export.separateColors}
                  onChange={(e) =>
                    setProject((p) => ({
                      ...p,
                      export: { ...p.export, separateColors: e.target.checked },
                    }))
                  }
                />
                <span>
                  {say(
                    "Přidat samostatné STL těla a textu",
                    "Include separate body and text STL files",
                  )}
                </span>
              </label>
              <button
                className="primary download-set"
                disabled={
                  !valid.length ||
                  !!errors.length ||
                  overPieceLimit ||
                  !!layout.unplaced.length ||
                  busy !== null
                }
                onClick={downloadZip}
              >
                {busy
                  ? say("Připravuji soubory…", "Preparing files…")
                  : say(
                      "Stáhnout celou sadu (ZIP)",
                      "Download complete set (ZIP)",
                    )}
              </button>
              <button
                disabled={
                  !active ||
                  !!active.errors.length ||
                  !active.quantity ||
                  busy !== null
                }
                onClick={downloadOne}
              >
                {active
                  ? say(
                      `Stáhnout pouze „${active.text}“ (STL)`,
                      `Download only “${active.text}” (STL)`,
                    )
                  : say(
                      "Stáhnout jednu kostku (STL)",
                      "Download one brick (STL)",
                    )}
              </button>
              {busy && (
                <div className="progress" role="status">
                  <progress value={busy.done} max={busy.total} />
                  <span>
                    {busy.done}/{busy.total}
                  </span>
                  <button onClick={stopExport}>{t(locale, "cancel")}</button>
                </div>
              )}
              <p className="field-hint">
                {say(
                  "ZIP obsahuje kostky, tiskové podložky a přehled dílů. STL neobsahuje barvy ani profil tiskárny.",
                  "The ZIP includes bricks, print plates and a part manifest. STL contains no colours or printer profile.",
                )}
              </p>
              <div className="calibration-note">{t(locale, "fitWarning")}</div>
              <div className="project-files">
                <h3>
                  {say("Uložit rozpracovaný projekt", "Save your project")}
                </h3>
                <p>
                  {say(
                    "Projekt můžete později načíst a znovu upravit.",
                    "Load the project later to continue editing.",
                  )}
                </p>
                <label>
                  {say("Název projektu", "Project name")}
                  <input
                    value={project.name}
                    maxLength={MAX_PROJECT_TEXT}
                    onChange={(e) =>
                      setProject((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </label>
                <div className="project-file-actions">
                  <button onClick={exportJson}>
                    {say("Uložit projekt", "Save project")}
                  </button>
                  <label className="file-button">
                    {say("Načíst projekt", "Load project")}
                    <input
                      aria-label={say("Načíst projekt", "Load project")}
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void importJson(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            </section>
          </div>
        )}
        {step === 4 && (
          <div className="tab-panel settings">
            <div className="settings-toolbar">
              <p>
                {locale === "cs"
                  ? "Obnoví výchozí geometrii, typ kostky a rozměry tiskové plochy."
                  : "Restore default geometry, brick type and bed dimensions."}
              </p>
              <button
                className="reset-settings"
                onClick={() =>
                  setProject((p) =>
                    refresh({
                      ...p,
                      geometry: { ...DEFAULT_GEOMETRY },
                      export: {
                        ...p.export,
                        bedWidth: DEFAULT_EXPORT.bedWidth,
                        bedDepth: DEFAULT_EXPORT.bedDepth,
                      },
                    }),
                  )
                }
              >
                {locale === "cs"
                  ? "Obnovit výchozí nastavení"
                  : "Reset settings"}
              </button>
            </div>
            <div className="setting-grid">
              <h3>{say("Text na kostce", "Brick lettering")}</h3>
              <NumberSetting
                locale={locale}
                label="Global font size"
                value={project.geometry.fontSize}
                min={4}
                max={10}
                step={0.1}
                unit="mm"
                onChange={(fontSize) =>
                  setProject((p) =>
                    refresh({
                      ...p,
                      geometry: { ...p.geometry, fontSize },
                    }),
                  )
                }
              />
              <NumberSetting
                locale={locale}
                label="Raised text"
                value={project.geometry.textHeight}
                min={0.2}
                max={3}
                step={0.1}
                unit="mm"
                onChange={(textHeight) =>
                  setProject((p) => ({
                    ...p,
                    geometry: { ...p.geometry, textHeight },
                  }))
                }
              />
              <NumberSetting
                locale={locale}
                label="Edge margin"
                value={project.geometry.edgeMargin}
                min={1}
                max={5}
                step={0.1}
                unit="mm"
                onChange={(edgeMargin) =>
                  setProject((p) =>
                    refresh({
                      ...p,
                      geometry: { ...p.geometry, edgeMargin },
                    }),
                  )
                }
              />
              <h3 id="bed-dimensions" tabIndex={-1}>
                {say("Tisková plocha", "Print bed")}
              </h3>
              <NumberSetting
                locale={locale}
                label="Bed width"
                value={project.export.bedWidth}
                min={100}
                max={500}
                unit="mm"
                onChange={(bedWidth) =>
                  setProject((p) => ({
                    ...p,
                    export: { ...p.export, bedWidth },
                  }))
                }
              />
              <NumberSetting
                locale={locale}
                label="Bed depth"
                value={project.export.bedDepth}
                min={100}
                max={500}
                unit="mm"
                onChange={(bedDepth) =>
                  setProject((p) => ({
                    ...p,
                    export: { ...p.export, bedDepth },
                  }))
                }
              />
              <>
                <h3>{say("Stěny a spoj", "Walls and fit")}</h3>
                <NumberSetting
                  locale={locale}
                  label="Wall thickness"
                  value={project.geometry.wallThickness}
                  min={1.2}
                  max={2.4}
                  step={0.1}
                  unit="mm"
                  onChange={(wallThickness) =>
                    setProject((p) => ({
                      ...p,
                      geometry: { ...p.geometry, wallThickness },
                    }))
                  }
                />
                <label className="check">
                  <input
                    type="checkbox"
                    checked={project.geometry.supportTubes}
                    onChange={(event) => {
                      const supportTubes = event.target.checked;
                      setProject((p) => ({
                        ...p,
                        geometry: { ...p.geometry, supportTubes },
                      }));
                    }}
                  />
                  <span>
                    {say(
                      "Kulaté podpěry na spodní straně",
                      "Round supports on the underside",
                    )}
                  </span>
                </label>
                {project.geometry.supportTubes && (
                  <>
                    <NumberSetting
                      locale={locale}
                      label="Clutch clearance"
                      value={project.geometry.clutchClearance}
                      min={0}
                      max={0.4}
                      step={0.05}
                      unit="mm"
                      onChange={(clutchClearance) =>
                        setProject((p) => ({
                          ...p,
                          geometry: { ...p.geometry, clutchClearance },
                        }))
                      }
                    />
                    <NumberSetting
                      locale={locale}
                      label="Tube outer diameter"
                      value={project.geometry.tubeOuterDiameter}
                      min={6}
                      max={7}
                      step={0.05}
                      unit="mm"
                      onChange={(tubeOuterDiameter) =>
                        setProject((p) => ({
                          ...p,
                          geometry: {
                            ...p.geometry,
                            tubeOuterDiameter,
                          },
                        }))
                      }
                    />
                    <NumberSetting
                      locale={locale}
                      label="Tube inner diameter"
                      value={project.geometry.tubeInnerDiameter}
                      min={4.2}
                      max={5.4}
                      step={0.05}
                      unit="mm"
                      onChange={(tubeInnerDiameter) =>
                        setProject((p) => ({
                          ...p,
                          geometry: {
                            ...p.geometry,
                            tubeInnerDiameter,
                          },
                        }))
                      }
                    />
                  </>
                )}
              </>
            </div>
            <div className="warning">⚠ {t(locale, "fitWarning")}</div>
          </div>
        )}
      </main>
      <dialog
        className="privacy-dialog"
        ref={privacyDialog}
        aria-labelledby="privacy-title"
      >
        <h2 id="privacy-title">{say("Soukromí", "Privacy")}</h2>
        <p>
          {say(
            "Věty, projekty i exporty se zpracovávají v prohlížeči. Aplikace je nikam neposílá a nepoužívá cookies ani analytiku.",
            "Sentences, projects, and exports are processed in your browser. The app sends none of this content anywhere and uses no cookies or analytics.",
          )}
        </p>
        <p>
          {say(
            "Pokud zapnete ukládání, projekt a volba ukládání zůstanou v místním úložišti tohoto prohlížeče, dokud je nesmažete.",
            "If you enable saving, your project and saving preference stay in this browser’s local storage until you delete them.",
          )}
        </p>
        <p>
          {say(
            "Web provozuje jimibr a hostuje ho GitHub Pages. GitHub při návštěvě zaznamenává IP adresu pro bezpečnostní účely.",
            "This site is maintained by jimibr and hosted on GitHub Pages. GitHub logs visitors’ IP addresses for security purposes.",
          )}{" "}
          <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">
            {say("Zásady ochrany soukromí GitHubu", "GitHub Privacy Statement")}
          </a>
          {" · "}
          <a href="https://github.com/jimibr">
            {say("Kontakt na provozovatele", "Contact the maintainer")}
          </a>
        </p>
        <div className="privacy-actions">
          {!saving && (
            <>
              <button type="button" onClick={startLocalSaving}>
                {say(
                  "Zapnout ukládání v tomto prohlížeči",
                  "Enable saving in this browser",
                )}
              </button>
              <button type="button" onClick={restoreLocalProject}>
                {say("Obnovit uložený projekt", "Restore a saved project")}
              </button>
            </>
          )}
          <button type="button" onClick={stopLocalSaving}>
            {saving
              ? say(
                  "Vypnout ukládání a smazat uložený projekt",
                  "Turn off saving and delete the saved project",
                )
              : say("Smazat uložený projekt", "Delete the saved project")}
          </button>
        </div>
        {privacyNotice && <p role="status">{privacyNotice}</p>}
        <form method="dialog">
          <button type="submit">{say("Zavřít", "Close")}</button>
        </form>
      </dialog>
    </div>
  );
}

function contentProject(project: Project, text: string): Project {
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (
    !project.kitId &&
    lines.length === project.sentences.length &&
    lines.every((line, i) => line === project.sentences[i]?.text)
  )
    return project;
  return refresh({
    ...project,
    kitId: undefined,
    sentences: lines.map((text, i) => {
      const previous = project.sentences[i];
      return previous?.text === text
        ? previous
        : sentence(text, project, previous?.id);
    }),
  });
}

function NumberSetting({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  locale,
}: {
  locale: "cs" | "en";
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
}) {
  const displayLabel =
    locale === "cs"
      ? ((
          {
            "Global font size": "Velikost písma",
            "Raised text": "Výška textu",
            "Edge margin": "Okraj kolem textu",
            "Bed width": "Šířka podložky",
            "Bed depth": "Hloubka podložky",
            "Wall thickness": "Tloušťka stěny",
            "Clutch clearance": "Vůle spoje",
            "Tube outer diameter": "Vnější průměr trubičky",
            "Tube inner diameter": "Vnitřní průměr trubičky",
          } as Record<string, string>
        )[label] ?? label)
      : label;
  return (
    <label className="number-setting">
      <span>{displayLabel}</span>
      <SettingIllustration
        displayLabel={displayLabel}
        locale={locale}
        label={label}
        value={value}
      />
      <div>
        <input
          aria-label={displayLabel}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            if (e.target.value !== "")
              onChange(Math.min(max, Math.max(min, Number(e.target.value))));
          }}
        />
        <em>{unit}</em>
      </div>
      <input
        aria-label={`${displayLabel} ${locale === "cs" ? "posuvník" : "slider"}`}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          if (e.target.value !== "")
            onChange(Math.min(max, Math.max(min, Number(e.target.value))));
        }}
      />
    </label>
  );
}
export default App;
