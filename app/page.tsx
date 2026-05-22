"use client";

import { useState } from "react";
import ThemeInput from "./components/ThemeInput";
import ConceptList from "./components/ConceptList";
import VariantGrid from "./components/VariantGrid";
import { streamSSE } from "./hooks/useStreamSSE";

const FASTAPI = "http://localhost:8000";

export default function Home() {
  const [theme, setTheme] = useState("");
  const [concepts, setConcepts] = useState<string[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [variantUrls, setVariantUrls] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1: brainstorm concepts from theme
  async function handleBrainstorm() {
    if (!theme.trim()) return;
    setLoading(true);
    setConcepts([]);
    setSelectedConcept(null);
    setVariantUrls([]);
    setError("");
    setStatus("");

    await streamSSE(`${FASTAPI}/api/brainstorm`, { theme }, {
      status: (e) => setStatus(e.message as string),
      concepts: (e) => {
        setConcepts(e.concepts as string[]);
        setStatus("");
        setLoading(false);
      },
      error: (e) => { setError(e.message as string); setLoading(false); },
    });
  }

  // Step 2: generate image variants from selected concept
  async function handleGenerate(concept: string) {
    setSelectedConcept(concept);
    setVariantUrls([]);
    setLoading(true);
    setError("");
    setStatus("");

    await streamSSE(`${FASTAPI}/api/generate`, { theme, concept }, {
      status: (e) => setStatus(e.message as string),
      variants: (e) => {
        // Prefix relative paths with the FastAPI origin so Next.js can load the images
        const urls = (e.urls as string[]).map((u) => `${FASTAPI}${u}`);
        setVariantUrls(urls);
        setStatus("");
        setLoading(false);
      },
      error: (e) => { setError(e.message as string); setLoading(false); },
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-900 gap-8 px-4 py-16">
      <h1 className="text-4xl font-bold text-white">T-Shirt Designer</h1>

      {/* Step 1: theme input */}
      <ThemeInput theme={theme} onChange={setTheme} onSubmit={handleBrainstorm} />

      {/* Streaming status message */}
      {loading && (
        <p className="text-slate-400 animate-pulse">{status || "Working..."}</p>
      )}

      {/* Error display */}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Step 2: concept selection — clicking a concept triggers image generation */}
      {concepts.length > 0 && (
        <div className="flex flex-col items-center gap-3 w-full max-w-xl">
          <p className="text-slate-400 text-sm">Select a concept to generate images</p>
          <ConceptList
            concepts={concepts}
            selected={selectedConcept}
            onSelect={handleGenerate}
            disabled={loading}
          />
        </div>
      )}

      {/* Step 3: generated image variants */}
      {variantUrls.length > 0 && (
        <div className="flex flex-col items-center gap-3 w-full max-w-xl">
          <p className="text-slate-400 text-sm">Generated variants</p>
          <VariantGrid urls={variantUrls} />
        </div>
      )}
    </main>
  );
}