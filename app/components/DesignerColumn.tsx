"use client";

import { useState, useEffect } from "react";
import ThemeInput from "./ThemeInput";
import ConceptList from "./ConceptList";
import VariantGrid from "./VariantGrid";
import RefinePanel from "./RefinePanel";
import type { Iteration } from "./RefinePanel";
import { streamSSE } from "../hooks/useStreamSSE";

const FASTAPI = "http://localhost:8000";

type Step = 1 | 2 | 3 | 4;

// ── Constants matching config.py ──────────────────────────────────────────────

const ASPECT_RATIOS = [
  "1:1","3:2","2:3","3:4","4:3","4:5","5:4","9:16","16:9","21:9","1:4","4:1","1:8","8:1",
];
const BRAINSTORM_SIZES = ["512", "1K", "2K"];
const MAX_VARIANTS = 4;

// ── Shared UI sub-components ─────────────────────────────────────────────────

function StatusBox({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-sm text-indigo-700" role="status" aria-live="polite">
      <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

function ErrorBox({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700" role="alert">
      <span className="flex-shrink-0" aria-hidden="true">⚠️</span>
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss error" className="text-red-400 hover:text-red-600 ml-2">✕</button>
    </div>
  );
}

interface StepCardProps {
  number: number;
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function StepCard({ number, title, collapsed, onToggle, children }: StepCardProps) {
  return (
    <section className="bg-slate-700 rounded-xl shadow-sm">
      {/* Header row — always visible, click to collapse/expand */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={!collapsed}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-100">
          {number} · {title}
        </h2>
        <span className="text-slate-400 text-xs ml-2" aria-hidden="true">
          {collapsed ? "›" : "∨"}
        </span>
      </button>
      {!collapsed && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}

// ── Column settings ───────────────────────────────────────────────────────────

export interface ColumnSettings {
  maxColors: number;
  bgColor: string;
  aspectRatio: string;
  variantSize: string;
}

const DEFAULT_SETTINGS: ColumnSettings = {
  maxColors: 6,
  bgColor: "#FF00FF",
  aspectRatio: "1:1",
  variantSize: "512",
};

interface SettingsPanelProps {
  settings: ColumnSettings;
  onChange: (s: ColumnSettings) => void;
  disabled: boolean;
}

function SettingsPanel({ settings, onChange, disabled }: SettingsPanelProps) {
  function set<K extends keyof ColumnSettings>(key: K, value: ColumnSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  const labelCls = "text-xs font-medium text-slate-200 block mb-1";
  const selectCls = "w-full text-xs border border-slate-500 bg-slate-600 text-slate-100 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50";

  return (
    <div className="border-b border-slate-700 bg-slate-800/60 px-4 py-3 space-y-3">

      {/* Max colors slider */}
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className={labelCls}>Max colors</label>
          <span className="text-xs font-semibold text-indigo-300">{settings.maxColors}</span>
        </div>
        <input
          type="range" min={1} max={8} step={1}
          value={settings.maxColors}
          onChange={(e) => set("maxColors", parseInt(e.target.value))}
          disabled={disabled}
          className="w-full accent-indigo-500 disabled:opacity-50"
        />
      </div>

      {/* Background color */}
      <div>
        <label className={labelCls}>
          Background color
          <span className="text-slate-400 font-normal ml-1">({settings.bgColor})</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={settings.bgColor}
            onChange={(e) => set("bgColor", e.target.value)}
            disabled={disabled}
            className="h-8 w-16 rounded border border-slate-500 bg-transparent cursor-pointer disabled:opacity-50"
          />
          <button
            onClick={() => set("bgColor", DEFAULT_SETTINGS.bgColor)}
            disabled={disabled}
            className="text-[10px] px-2 py-1 rounded bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Aspect ratio + Variant resolution — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Aspect ratio</label>
          <select
            value={settings.aspectRatio}
            onChange={(e) => set("aspectRatio", e.target.value)}
            disabled={disabled}
            className={selectCls}
          >
            {ASPECT_RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Variant res</label>
          <select
            value={settings.variantSize}
            onChange={(e) => set("variantSize", e.target.value)}
            disabled={disabled}
            className={selectCls}
          >
            {BRAINSTORM_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

    </div>
  );
}

// ── Load request payload ──────────────────────────────────────────────────────

export interface LoadRequest {
  url: string;          // full URL including FASTAPI origin
  width: number;
  height: number;
  sessionName: string;
}

// Payload sent from the object browser when the user clicks 🎯 on a thumbnail
export interface ReferenceRequest {
  url: string;  // full URL including FASTAPI origin
}

// ── Main column component ─────────────────────────────────────────────────────

interface DesignerColumnProps {
  columnNumber: number;
  isActive: boolean;
  onActivate: () => void;
  onRemove: () => void;
  isOnly: boolean;
  loadRequest: LoadRequest | null;
  onLoadHandled: () => void;
  referenceRequest: ReferenceRequest | null;
  onReferenceHandled: () => void;
  defaultNumVariants: number;
  onPickRequest: () => void;   // open the output browser targeting this column
}

export default function DesignerColumn({ columnNumber, isActive, onActivate, onRemove, isOnly, loadRequest, onLoadHandled, referenceRequest, onReferenceHandled, defaultNumVariants, onPickRequest }: DesignerColumnProps) {
  const [theme, setTheme] = useState("");
  const [concepts, setConcepts] = useState<string[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [variantUrls, setVariantUrls] = useState<string[]>([]);
  const [variantPaths, setVariantPaths] = useState<string[]>([]);
  const [variantPrompts, setVariantPrompts] = useState<string[]>([]);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<Step>(1);
  const [settings, setSettings] = useState<ColumnSettings>({ ...DEFAULT_SETTINGS });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goingDirect, setGoingDirect] = useState(false);
  const [directMode, setDirectMode] = useState(false);  // true when variants came from Go Direct
  // Set of step numbers that are currently collapsed; empty = all expanded
  const [collapsedSteps, setCollapsedSteps] = useState<Set<number>>(new Set());
  // Reference image for variant generation (set from the object browser via 🎯)
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [referenceMode, setReferenceMode] = useState<"style" | "copy">("style");

  // The set of step numbers currently visible (rendered in the DOM)
  const visibleSteps = [1, ...(step >= 2 ? [2] : []), ...(step >= 3 && variantUrls.length > 0 ? [3] : []), ...(step >= 4 && finalUrl ? [4] : [])];
  const allCollapsed = visibleSteps.length > 0 && visibleSteps.every((s) => collapsedSteps.has(s));

  function toggleStep(s: number) {
    setCollapsedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  function collapseAll() {
    if (allCollapsed) {
      setCollapsedSteps(new Set()); // expand all
    } else {
      setCollapsedSteps(new Set(visibleSteps)); // collapse all
    }
  }

  function handleClear() {
    const hasWork = theme || concepts.length || variantUrls.length;
    if (hasWork && !window.confirm("Clear this column? All work will be lost.")) return;
    setTheme("");
    setConcepts([]);
    setSelectedConcept(null);
    setVariantUrls([]);
    setVariantPaths([]);
    setVariantPrompts([]);
    setSelectedVariantIdx(null);
    setFinalUrl(null);
    setStep(1);
    setDirectMode(false);
    setStatus("");
    setError("");
    setCollapsedSteps(new Set());
  }

  // When the browser sends a load request, reset column state and jump to Step 3
  useEffect(() => {
    if (!loadRequest) return;
    if (step > 1 && !window.confirm("Load this image? Your current column session will be cleared.")) {
      onLoadHandled();
      return;
    }
    // Strip the FASTAPI origin to get the relative path the server can resolve on disk.
    const relativePath = loadRequest.url.startsWith(FASTAPI)
      ? loadRequest.url.slice(FASTAPI.length).replace(/^\//, "")
      : "";

    setTheme(loadRequest.sessionName);
    setConcepts([]);
    setSelectedConcept(null);
    setVariantUrls([loadRequest.url]);
    setVariantPaths(relativePath ? [relativePath] : []);
    setVariantPrompts([]);  // prompt will be looked up from prompts.md on the server
    setSelectedVariantIdx(null);
    setFinalUrl(null);
    setError("");
    setStatus("");
    setStep(3);
    setCollapsedSteps(new Set());
    onLoadHandled();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadRequest]);

  // When the browser sends a reference request, store the URL and acknowledge it
  useEffect(() => {
    if (!referenceRequest) return;
    setReferenceImageUrl(referenceRequest.url);
    onReferenceHandled();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceRequest]);

  function resetError() { setError(""); }

  async function handleBrainstorm() {
    if (!theme.trim()) return;
    setLoading(true);
    setLoadingStep(1);
    setConcepts([]);
    setSelectedConcept(null);
    setVariantUrls([]);
    setVariantPaths([]);
    setVariantPrompts([]);
    setSelectedVariantIdx(null);
    setFinalUrl(null);
    setDirectMode(false);
    setError("");
    setStatus("Generating concepts...");
    setStep(1);

    await streamSSE(`${FASTAPI}/api/brainstorm`, { theme }, {
      status: (e) => setStatus(e.message as string),
      concepts: (e) => {
        setConcepts(e.concepts as string[]);
        setStep(2);
        setStatus("");
        setLoading(false);
      },
      error: (e) => { setError(e.message as string); setLoading(false); },
    });
  }

  // Go Direct — skip brainstorm, use theme as the concept and generate immediately
  async function handleGoDirect() {
    if (!theme.trim()) return;
    setDirectMode(true);
    setStep(2);  // show Step 2 with the direct mode message immediately
    setGoingDirect(true);
    await handleGenerate(theme.trim());
    setGoingDirect(false);
  }

  async function handleGenerate(concept: string) {
    setSelectedConcept(concept);
    // Keep previous variants — new batch will be appended, not replaced
    setSelectedVariantIdx(null);
    setFinalUrl(null);
    setLoading(true);
    setLoadingStep(2);
    setError("");
    setStatus("Building prompts...");

    // Strip FASTAPI origin to get the relative path the backend can open from disk
    const refPath = referenceImageUrl?.startsWith(FASTAPI)
      ? referenceImageUrl.slice(FASTAPI.length).replace(/^\//, "")
      : "";

    await streamSSE(`${FASTAPI}/api/generate`, {
      theme,
      concept,
      num_variants: defaultNumVariants,
      max_colors: settings.maxColors,
      bg_color: settings.bgColor,
      aspect_ratio: settings.aspectRatio,
      variant_size: settings.variantSize,
      ...(refPath ? { reference_path: refPath, reference_mode: referenceMode } : {}),
    }, {
      status: (e) => setStatus(e.message as string),
      variants: (e) => {
        const urls = (e.urls as string[]).map((u) => `${FASTAPI}${u}`);
        setVariantUrls((prev) => [...prev, ...urls]);
        setVariantPaths((prev) => [...prev, ...(e.paths as string[])]);
        setVariantPrompts((prev) => [...prev, ...(e.prompts as string[])]);
        setStep(3);
        setStatus("");
        setLoading(false);
      },
      error: (e) => { setError(e.message as string); setLoading(false); },
    });
  }

  // Upload — save image to disk via the backend, then load it into Step 3
  async function handleUpload(file: File) {
    setLoading(true);
    setLoadingStep(1);
    setError("");
    setStatus("Uploading image...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${FASTAPI}/api/upload_variant`, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const data = await res.json() as { url: string; path: string };

      setTheme(file.name.replace(/\.[^/.]+$/, ""));  // use filename as theme label
      setConcepts([]);
      setSelectedConcept(null);
      setVariantUrls([`${FASTAPI}${data.url}`]);
      setVariantPaths([data.path]);
      setVariantPrompts([""]);
      setSelectedVariantIdx(null);
      setFinalUrl(null);
      setStep(3);
      setStatus("");
      setCollapsedSteps(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalize() {
    if (selectedVariantIdx === null) return;
    setFinalUrl(null);
    setLoading(true);
    setLoadingStep(3);
    setError("");
    setStatus("Generating final design...");

    await streamSSE(`${FASTAPI}/api/finalize`, {
      prompt: variantPrompts[selectedVariantIdx],
      variant_path: variantPaths[selectedVariantIdx],
      final_size: "4K",
    }, {
      status: (e) => setStatus(e.message as string),
      final: (e) => {
        setFinalUrl(`${FASTAPI}${e.url as string}`);
        setStep(4);
        setStatus("");
        setLoading(false);
      },
      error: (e) => { setError(e.message as string); setLoading(false); },
    });
  }

  return (
    <div
      className={`flex flex-col w-[380px] flex-shrink-0 h-full border-r border-slate-700 last:border-r-0 border-t-2 transition-colors
        ${isActive ? "border-t-indigo-500" : "border-t-transparent"}`}
      onClick={onActivate}
    >

      {/* Column header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b border-slate-700 flex-shrink-0 transition-colors
        ${isActive ? "bg-indigo-900/40" : "bg-slate-800"}`}>
        <span className={`text-xs font-semibold uppercase tracking-wider transition-colors
          ${isActive ? "text-indigo-300" : "text-slate-400"}`}>
          {isActive && <span className="mr-1.5">▶</span>}Design {columnNumber}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setSettingsOpen((v) => !v); }}
            aria-pressed={settingsOpen}
            title="Toggle column settings"
            className={`text-xs px-2 py-1 rounded transition-colors
              ${settingsOpen ? "bg-indigo-700 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-600"}`}
          >
            ⚙ Settings
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            title="Clear this column"
            className="text-xs px-2 py-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-600 transition-colors"
          >
            ↺ Clear
          </button>
          <button
            onClick={onRemove}
            disabled={isOnly}
            title={isOnly ? "Can't remove the last column" : "Remove this column"}
            className="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm leading-none"
            aria-label="Remove column"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Collapsible settings panel */}
      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          disabled={loading}
        />
      )}

      {/* Reference image strip — shown when an image has been picked from the browser */}
      {referenceImageUrl && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-900/30 border-b border-amber-700/50 flex-shrink-0">
          {/* Thumbnail */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={referenceImageUrl} alt="Reference" className="w-8 h-8 object-contain rounded border border-amber-600/50 flex-shrink-0 bg-slate-900" />
          {/* Label + mode selector */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">Reference image</p>
            <div className="flex gap-1">
              {(["style", "copy"] as const).map((m) => (
                <button
                  key={m}
                  onClick={(e) => { e.stopPropagation(); setReferenceMode(m); }}
                  className={`text-[10px] px-1.5 py-0.5 rounded capitalize transition-colors
                    ${referenceMode === m
                      ? "bg-amber-500 text-white"
                      : "bg-slate-700 text-slate-400 hover:text-slate-200"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          {/* Clear */}
          <button
            onClick={(e) => { e.stopPropagation(); setReferenceImageUrl(null); }}
            title="Remove reference image"
            className="text-slate-500 hover:text-red-400 transition-colors text-sm leading-none flex-shrink-0"
            aria-label="Remove reference image"
          >
            ✕
          </button>
        </div>
      )}

      {/* Collapse all / Expand all — only shown when more than one step is visible */}
      {visibleSteps.length > 1 && (
        <div className="flex justify-end px-4 pt-2">
          <button
            onClick={(e) => { e.stopPropagation(); collapseAll(); }}
            className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            {allCollapsed ? "∨ Expand all" : "∧ Collapse all"}
          </button>
        </div>
      )}

      {/* Scrollable workflow steps */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        <StepCard number={1} title="Enter a theme" collapsed={collapsedSteps.has(1)} onToggle={() => toggleStep(1)}>
          <ThemeInput
            theme={theme}
            onChange={setTheme}
            onBrainstorm={handleBrainstorm}
            onGoDirect={handleGoDirect}
            onPickRequest={onPickRequest}
            onUpload={handleUpload}
            disabled={loading}
            brainstorming={loading && loadingStep === 1}
            goingDirect={goingDirect}
            numVariants={defaultNumVariants}
          />
          {(loadingStep === 1 || goingDirect) && status && <div className="mt-3"><StatusBox message={status} /></div>}
          {(loadingStep === 1 || goingDirect) && error && <div className="mt-3"><ErrorBox message={error} onDismiss={resetError} /></div>}
        </StepCard>

        {step >= 2 && (
          <StepCard number={2} title="Pick a concept" collapsed={collapsedSteps.has(2)} onToggle={() => toggleStep(2)}>
            {directMode ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-500 bg-slate-800 text-sm text-slate-200">
                <span aria-hidden="true">🎨</span>
                <span>Direct mode — generating from your prompt as-is.</span>
              </div>
            ) : (
              <ConceptList
                concepts={concepts}
                selected={selectedConcept}
                onSelect={setSelectedConcept}
                onGenerate={() => selectedConcept && handleGenerate(selectedConcept)}
                disabled={loading}
                numVariants={defaultNumVariants}
              />
            )}
            {!directMode && loadingStep === 2 && status && <div className="mt-3"><StatusBox message={status} /></div>}
            {!directMode && loadingStep === 2 && error && <div className="mt-3"><ErrorBox message={error} onDismiss={resetError} /></div>}
          </StepCard>
        )}

        {step >= 3 && variantUrls.length > 0 && (
          <StepCard number={3} title="Generated variants" collapsed={collapsedSteps.has(3)} onToggle={() => toggleStep(3)}>
            <p className="text-xs text-slate-300 mb-3">Click a variant to select it, then finalize or refine it below.</p>
            <VariantGrid
              urls={variantUrls}
              selectedIdx={selectedVariantIdx}
              onSelect={setSelectedVariantIdx}
              disabled={loading}
            />

            {/* Refine panel — re-render at new size/AR or generate an iteration */}
            {selectedVariantIdx !== null && variantPaths[selectedVariantIdx] && (
              <RefinePanel
                key={selectedVariantIdx}
                variantPath={variantPaths[selectedVariantIdx]}
                variantUrl={variantUrls[selectedVariantIdx]}
                onIterationCreated={(iter: Iteration) => {
                  setVariantUrls((prev) => [...prev, iter.url]);
                  setVariantPaths((prev) => [...prev, iter.path]);
                  setVariantPrompts((prev) => [...prev, ""]);
                  setSelectedVariantIdx(variantUrls.length);
                }}
              />
            )}

            {selectedVariantIdx !== null && (
              <button
                onClick={handleFinalize}
                disabled={loading}
                className="mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading && loadingStep === 3 && (
                  <svg className="animate-spin h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                ✨ Finalize variant {selectedVariantIdx + 1} at 4K
              </button>
            )}
            {loadingStep === 3 && status && <div className="mt-3"><StatusBox message={status} /></div>}
            {loadingStep === 3 && error && <div className="mt-3"><ErrorBox message={error} onDismiss={resetError} /></div>}
          </StepCard>
        )}

        {step >= 4 && finalUrl && (
          <StepCard number={4} title="Final design" collapsed={collapsedSteps.has(4)} onToggle={() => toggleStep(4)}>
            <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-slate-600 bg-slate-900">
              <img src={finalUrl} alt="Final design" className="w-full h-full object-contain" />
            </div>
            <a
              href={finalUrl}
              download
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-500 transition-colors"
            >
              ⬇ Download PNG
            </a>
          </StepCard>
        )}

      </div>
    </div>
  );
}
