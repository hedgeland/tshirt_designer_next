"use client";

import { useState } from "react";
import ThemeInput from "./components/ThemeInput";
import { streamSSE } from "./hooks/useStreamSSE";

export default function Home() {
  const [theme, setTheme] = useState("");
  const [concepts, setConcepts] = useState<string[]>([]);
  const [status, setStatus] = useState("");  // progress messages streamed from the server
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!theme.trim()) return;

    // Reset all state before starting a new generation
    setLoading(true);
    setConcepts([]);
    setError("");
    setStatus("");

    await streamSSE(
      "http://localhost:8000/api/brainstorm",
      { theme },
      {
        // "status" events carry progress messages while Gemini is thinking
        status: (event) => setStatus(event.message as string),

        // "concepts" event carries the final array of generated concepts
        concepts: (event) => {
          setConcepts(event.concepts as string[]);
          setStatus("");
          setLoading(false);
        },

        // "error" events mean something went wrong on the server
        error: (event) => {
          setError(event.message as string);
          setLoading(false);
        },
      }
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 gap-6 px-4">
      <h1 className="text-4xl font-bold text-white">T-Shirt Designer</h1>

      <ThemeInput
        theme={theme}
        onChange={setTheme}
        onSubmit={handleSubmit}
      />

      {/* Show streaming status while Gemini is generating */}
      {loading && (
        <p className="text-slate-400 animate-pulse">{status || "Generating..."}</p>
      )}

      {/* Error state */}
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Concepts list — shown once generation completes */}
      {concepts.length > 0 && (
        <ul className="flex flex-col gap-3 w-full max-w-xl">
          {concepts.map((concept, i) => (
            <li
              key={i}
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-200 text-sm cursor-pointer hover:border-indigo-500 hover:bg-slate-700 transition-colors"
            >
              {concept}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}