/// <reference types="chrome" />

import React, { useState, useEffect, useRef } from "react";
import { ChartContext, AnalysisResult } from "./types";

type RobotMood = "idle" | "dragging" | "analyzing" | "happy" | "thinking";

/* ---------------- ROBOT ICON ---------------- */

const RobotIcon: React.FC<{ mood: RobotMood }> = ({ mood }) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute w-12 h-12 bg-black/20 blur-md translate-y-8 rounded-full" />

      <div
        className={`relative w-14 h-14 rounded-full bg-gradient-to-br from-slate-100 via-slate-200 to-slate-400
        shadow-[inset_-4px_-4px_10px_rgba(0,0,0,0.2),inset_4px_4px_10px_rgba(255,255,255,0.8),0_10px_20px_rgba(0,0,0,0.15)]
        flex items-center justify-center transition-all duration-500
        ${mood === "idle" ? "animate-bounce-slow" : ""}`}
      >
        <div className="absolute -top-3 w-1 h-4 bg-slate-400 rounded-full">
          <div
            className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full
            ${mood === "analyzing" ? "bg-red-500 animate-pulse" : "bg-blue-400"}`}
          />
        </div>

        <div className="w-10 h-8 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-700">
          {mood === "analyzing" ? (
            <div className="absolute inset-0 bg-cyan-400 animate-scan" />
          ) : (
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full" />
              <div className="w-2 h-2 bg-cyan-400 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------- APP ---------------- */

const App: React.FC = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [context, setContext] = useState<ChartContext | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [mood, setMood] = useState<RobotMood>("idle");

  const robotRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  /* -------- INIT POSITION -------- */

  useEffect(() => {
    setPosition({
      x: window.innerWidth - 100,
      y: window.innerHeight - 100
    });
  }, []);

  /* -------- MOOD CONTROL -------- */

  useEffect(() => {
    if (isAnalyzing) setMood("analyzing");
    else if (isDragging) setMood("dragging");
    else if (showOverlay) setMood("happy");
    else setMood("idle");
  }, [isAnalyzing, isDragging, showOverlay]);

  /* -------- DRAG SAFETY -------- */

  useEffect(() => {
    const cancel = () => setIsDragging(false);
    window.addEventListener("pointerup", cancel);
    return () => window.removeEventListener("pointerup", cancel);
  }, []);

  /* -------- DRAG HANDLERS -------- */

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    const rect = robotRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    robotRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y
    });
  };

  /* -------- ANALYSIS -------- */

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    robotRef.current?.releasePointerCapture(e.pointerId);

    if (robotRef.current) robotRef.current.style.pointerEvents = "none";
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (robotRef.current) robotRef.current.style.pointerEvents = "auto";

    if (!target) return;

    const chartContext: ChartContext = {
      title: document.title,
      url: window.location.href,
      chartType: "Unknown",
      x: position.x,
      y: position.y,
      labels: [],
      extractedText: []
    };

    try {
      setIsAnalyzing(true);
      setContext(chartContext);

      const result: AnalysisResult = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "ANALYZE_CHART", payload: chartContext },
          response => {
            if (chrome.runtime.lastError || !response?.success) {
              reject(new Error("AI analysis failed"));
            } else {
              resolve(response.result);
            }
          }
        );
      });

      setAnalysis(result);
      setShowOverlay(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* -------- RENDER -------- */

  return (
    <div className="fixed inset-0 pointer-events-none z-[2147483647]">
      <div
        ref={robotRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ left: position.x, top: position.y }}
        className="absolute w-20 h-20 pointer-events-auto cursor-grab"
      >
        <RobotIcon mood={mood} />
      </div>

      {showOverlay && analysis && (
        <div className="fixed right-8 top-1/2 -translate-y-1/2 w-96 bg-white rounded-3xl shadow-xl p-6">
          <h3 className="font-bold mb-4">AI Analysis</h3>
          <p className="italic mb-4">{analysis.summary}</p>
          <ul className="list-disc pl-4">
            {analysis.insights.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
          <button
            className="mt-4 w-full bg-slate-800 text-white py-2 rounded-xl"
            onClick={() => setShowOverlay(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
