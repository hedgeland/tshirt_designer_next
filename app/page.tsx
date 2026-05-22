"use client";

import { useState } from "react";
import Header from "./components/Header";
import ThemeInput from "./components/ThemeInput";
import ConceptList from "./components/ConceptList";
import VariantGrid from "./components/VariantGrid";
import { streamSSE } from "./hooks/useStreamSSE";

const FASTAPI = "http://localhost:8000";

// Which step the user is currently on — controls which sections are visible
type Step = 1 | 2 | 3 | 4;

// Spinner + message box shown while an SSE stream is in progress
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

// Red error box with dismiss button
function ErrorBox({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700" role="alert">
      <span className="flex-shrink-0" aria-hidden="true">⚠️</span>
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss error" className="text-red-400 hover:text-red-600 ml-2">✕</button>
    </div>
  );
}

// Numbered step card wrapper — dark slate card matching existing app sections
function StepCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-slate-700 rounded-xl shadow-sm p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-100 mb-3">
        {number} · {title}
      </h2>
      {children}
    </section>
  );
}

export default function Home() {
  const [theme, setTheme] = useState("");
  const [concepts, setConcepts] = useState<string[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [variantUrls, setVariantUrls] = useState<string[]>([]);
  const [variantPaths, setVariantPaths] = useState<string[]>([]);  // disk paths for finalize
  const [variantPrompts, setVariantPrompts] = useState<string[]>([]);  // prompts for finalize
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Which step's status/error box to show (avoids showing stale messages from previous steps)
  const [loadingStep, setLoadingStep] = useState<Step>(1);

  function resetError() { setError(""); }

  // Step 1 → 2: brainstorm concepts from theme
  async function handleBrainstorm() {
    if (!theme.trim()) return;
    setLoading(true);
    setLoadingStep(1);
    setConcepts([]);
    setSelectedConcept(null);
    setVariantUrls([]);
    setError("");
    setStatus("Generating concepts...");

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

  // Step 2 → 3: generate image variants from selected concept
  async function handleGenerate(concept: string) {
    setSelectedConcept(concept);
    setVariantUrls([]);
    setVariantPaths([]);
    setVariantPrompts([]);
    setSelectedVariantIdx(null);
    setFinalUrl(null);
    setLoading(true);
    setLoadingStep(2);
    setError("");
    setStatus("Building prompts...");

    await streamSSE(`${FASTAPI}/api/generate`, { theme, concept }, {
      status: (e) => setStatus(e.message as string),
      variants: (e) => {
        const urls = (e.urls as string[]).map((u) => `${FASTAPI}${u}`);
        setVariantUrls(urls);
        setVariantPaths(e.paths as string[]);
        setVariantPrompts(e.prompts as string[]);
        setStep(3);
        setStatus("");
        setLoading(false);
      },
      error: (e) => { setError(e.message as string); setLoading(false); },
    });
  }

  // Step 3 → 4: upscale selected variant to final resolution
  async function handleFinalize() {
    if (selectedVariantIdx === null) return;
    setFinalUrl(null);
    setLoading(true);
    setLoadingStep(3);
    setError("");
    setStatus(`Generating final design...`);

    await streamSSE(`${FASTAPI}/api/finalize`, {
      prompt: variantPrompts[selectedVariantIdx],
      variant_path: variantPaths[selectedVariantIdx],
      final_size: "1K",
    }, {
      status: (e) => setStatus(e.message as string),
      final: (e) => {
        setFinalUrl(`${FASTAPI}${e.url as string}`);
        setStep(4 as Step);
        setStatus("");
        setLoading(false);
      },
      error: (e) => { setError(e.message as string); setLoading(false); },
    });
  }

  return (
    <div className="h-full flex flex-col">
      <Header />

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto space-y-4">

          {/* Step 1: Enter a theme */}
          <StepCard number={1} title="Enter a theme">
            <ThemeInput
              theme={theme}
              onChange={setTheme}
              onSubmit={handleBrainstorm}
              disabled={loading}
            />
            {loadingStep === 1 && status && <div className="mt-3"><StatusBox message={status} /></div>}
            {loadingStep === 1 && error && <div className="mt-3"><ErrorBox message={error} onDismiss={resetError} /></div>}
          </StepCard>

          {/* Step 2: Pick a concept — appears after brainstorm */}
          {step >= 2 && (
            <StepCard number={2} title="Pick a concept">
              <ConceptList
                concepts={concepts}
                selected={selectedConcept}
                onSelect={handleGenerate}
                disabled={loading}
              />
              {loadingStep === 2 && status && <div className="mt-3"><StatusBox message={status} /></div>}
              {loadingStep === 2 && error && <div className="mt-3"><ErrorBox message={error} onDismiss={resetError} /></div>}
            </StepCard>
          )}

          {/* Step 3: Generated variants — click to select, then finalize */}
          {step >= 3 && variantUrls.length > 0 && (
            <StepCard number={3} title="Generated variants">
              <p className="text-xs text-slate-300 mb-3">Click a variant to select it, then finalize at higher resolution.</p>
              <VariantGrid
                urls={variantUrls}
                selectedIdx={selectedVariantIdx}
                onSelect={setSelectedVariantIdx}
                disabled={loading}
              />
              {/* Finalize button — only shown once a variant is selected */}
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
                  ✨ Finalize variant {selectedVariantIdx + 1}
                </button>
              )}
              {loadingStep === 3 && status && <div className="mt-3"><StatusBox message={status} /></div>}
              {loadingStep === 3 && error && <div className="mt-3"><ErrorBox message={error} onDismiss={resetError} /></div>}
            </StepCard>
          )}

          {/* Step 4: Final high-resolution image */}
          {step >= 4 && finalUrl && (
            <StepCard number={4} title="Final design">
              <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-slate-600 bg-slate-900">
                <img
                  src={finalUrl}
                  alt="Final design"
                  className="w-full h-full object-contain"
                />
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
    </div>
  );
}