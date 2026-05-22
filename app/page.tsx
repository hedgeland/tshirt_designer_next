"use client";

import { useState } from "react";
import ThemeInput from "./components/ThemeInput";

export default function Home() {
  const [theme, setTheme] = useState("");
  const [concepts, setConcepts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!theme.trim()) return;
    setLoading(true);
    setConcepts([]);

    const response = await fetch("http://localhost:8000/api/brainstorm-simple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });

    const data = await response.json();
    setConcepts(data.concepts);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 gap-6">
      <h1 className="text-4xl font-bold text-white">T-Shirt Designer</h1>

      <ThemeInput
        theme={theme}
        onChange={setTheme}
        onSubmit={handleSubmit}
      />

      {loading && (
        <p className="text-slate-400 animate-pulse">Generating concepts...</p>
      )}

      {concepts.length > 0 && (
        <ul className="flex flex-col gap-3 w-full max-w-md">
          {concepts.map((concept, i) => (
            <li key={i}
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-200 
  text-sm cursor-pointer hover:border-indigo-500 hover:bg-slate-700 transition-colors">
              {concept}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}