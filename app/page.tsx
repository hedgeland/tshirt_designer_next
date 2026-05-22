"use client";

import { useState } from "react";
import Header from "./components/Header";
import ThemeInput from "./components/ThemeInput";
import ConceptList from "./components/ConceptList";
import VariantGrid from "./components/VariantGrid";
import { streamSSE } from "./hooks/useStreamSSE";

const FASTAPI = "http://localhost:8000";

// Which step the user is currently on — controls which sections are visible
type Step = 1 | 2 | 3;

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
    setLoading(true);
    setLoadingStep(2);
    setError("");
    setStatus("Building prompts...");

    await streamSSE(`${FASTAPI}/api/generate`, { theme, concept }, {
      status: (e) => setStatus(e.message as string),
      variants: (e) => {
        const urls = (e.urls as string[]).map((u) => `${FASTAPI}${u}`);
        setVariantUrls(urls);
        setStep(3);
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

          {/* Step 3: Generated variants — appears after generate */}
          {step >= 3 && variantUrls.length > 0 && (
            <StepCard number={3} title="Generated variants">
              <VariantGrid urls={variantUrls} />
            </StepCard>
          )}

        </div>
      </div>
    </div>
  );
}