
// Add global declaration for chrome to fix TypeScript errors.
declare const chrome: any;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChartContext, AnalysisResult } from './types';
import { analyzeChartContext } from './geminiService';

type RobotMood = 'idle' | 'dragging' | 'analyzing' | 'happy' | 'thinking';

const RobotIcon: React.FC<{ mood: RobotMood }> = ({ mood }) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center group">
      {/* 3D Body Shadow */}
      <div className="absolute w-12 h-12 bg-black/20 blur-md translate-y-8 rounded-full"></div>
      
      {/* Robot Main Body (Metallic Sphere) */}
      <div className={`
        relative w-14 h-14 rounded-full 
        bg-gradient-to-br from-slate-100 via-slate-200 to-slate-400
        shadow-[inset_-4px_-4px_10px_rgba(0,0,0,0.2),inset_4px_4px_10px_rgba(255,255,255,0.8),0_10px_20px_rgba(0,0,0,0.15)]
        flex flex-col items-center justify-center transition-all duration-500
        ${mood === 'idle' ? 'animate-bounce-slow' : ''}
      `}>
        {/* Antenna */}
        <div className="absolute -top-3 w-1 h-4 bg-slate-400 rounded-full">
          <div className={`
            absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full shadow-lg
            ${mood === 'analyzing' ? 'bg-red-500 animate-pulse' : 'bg-blue-400'}
          `}></div>
        </div>

        {/* Glass Face Plate */}
        <div className="w-10 h-8 rounded-xl bg-slate-900 shadow-inner flex flex-col items-center justify-center overflow-hidden border border-slate-700">
          <div className="flex gap-2 items-center justify-center h-full w-full relative">
            {mood === 'idle' && (
              <>
                <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_cyan] animate-pulse"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_cyan] animate-pulse"></div>
              </>
            )}
            {mood === 'dragging' && (
              <>
                <div className="w-3 h-3 border-2 border-cyan-300 rounded-full shadow-[0_0_8px_cyan]"></div>
                <div className="w-3 h-3 border-2 border-cyan-300 rounded-full shadow-[0_0_8px_cyan]"></div>
              </>
            )}
            {mood === 'thinking' && (
              <>
                <div className="w-2 h-0.5 bg-cyan-400 shadow-[0_0_8px_cyan] -rotate-12"></div>
                <div className="w-2 h-0.5 bg-cyan-400 shadow-[0_0_8px_cyan] rotate-12"></div>
              </>
            )}
            {mood === 'analyzing' && (
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400 to-transparent h-1 w-full animate-scan shadow-[0_0_10px_cyan]"></div>
            )}
            {mood === 'happy' && (
              <>
                <div className="w-3 h-3 border-t-2 border-cyan-400 rounded-full shadow-[0_0_8px_cyan] translate-y-1"></div>
                <div className="w-3 h-3 border-t-2 border-cyan-400 rounded-full shadow-[0_0_8px_cyan] translate-y-1"></div>
              </>
            )}
          </div>
        </div>
        <div className="absolute top-2 left-3 w-4 h-4 bg-white/40 blur-[2px] rounded-full -rotate-45"></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [context, setContext] = useState<ChartContext | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [mood, setMood] = useState<RobotMood>('idle');
  const [hasHistory, setHasHistory] = useState(false);
  
  const robotRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Load saved state on mount with safe API checks
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['lastContext', 'lastAnalysis'], (result: any) => {
        if (result.lastContext && result.lastAnalysis) {
          setContext(result.lastContext);
          setAnalysis(result.lastAnalysis);
          setHasHistory(true);
        }
      });
    } else {
      console.warn('Chrome Storage API not available in this context.');
    }
  }, []);

  useEffect(() => {
    if (isAnalyzing) setMood('analyzing');
    else if (isDragging) setMood('dragging');
    else if (showOverlay) setMood('happy');
    else setMood('idle');
  }, [isAnalyzing, isDragging, showOverlay]);

  const saveToStorage = (newContext: ChartContext, newAnalysis: AnalysisResult) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        lastContext: newContext,
        lastAnalysis: newAnalysis
      }, () => {
        setHasHistory(true);
      });
    }
  };

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

  const extractDataFromElement = (element: Element | null): ChartContext => {
    const labelsSet = new Set<string>();
    const extractedText: string[] = [];
    let chartType: 'SVG' | 'Canvas' | 'Unknown' = 'Unknown';

    if (element) {
      if (element.tagName.toLowerCase() === 'svg' || element.closest('svg')) {
        chartType = 'SVG';
        const svg = element.tagName.toLowerCase() === 'svg' ? (element as SVGElement) : (element.closest('svg') as SVGElement);
        svg?.querySelectorAll('text, tspan').forEach(t => {
          const text = t.textContent?.trim();
          if (text) labelsSet.add(text);
        });
        svg?.querySelectorAll('title, desc').forEach(meta => {
          const text = meta.textContent?.trim();
          if (text) extractedText.push(`Metadata: ${text}`);
        });
        const circles = svg?.querySelectorAll('circle');
        if (circles && circles.length > 0) {
          extractedText.push(`Detected ${circles.length} scatter points.`);
        }
        svg?.querySelectorAll('g').forEach(g => {
          const className = g.getAttribute('class') || '';
          if (className.toLowerCase().includes('series')) {
            const seriesText = g.textContent?.trim();
            if (seriesText) extractedText.push(`Series: ${seriesText.slice(0, 30)}`);
          }
        });
      } else if (element.tagName.toLowerCase() === 'canvas') {
        chartType = 'Canvas';
        element.parentElement?.querySelectorAll('[role="tooltip"], .chart-tooltip').forEach(tip => {
          if (tip.textContent) labelsSet.add(tip.textContent.trim());
        });
      }
    }

    return {
      title: document.title,
      url: window.location.href,
      chartType,
      x: position.x,
      y: position.y,
      labels: Array.from(labelsSet).slice(0, 15),
      extractedText: extractedText.slice(0, 10)
    };
  };

  const highlightElement = (el: Element | null) => {
    if (!el || !(el instanceof HTMLElement || el instanceof SVGElement)) return;
    const originalBorder = el.style.outline;
    el.style.outline = '4px solid #3b82f6';
    setTimeout(() => { el.style.outline = originalBorder; }, 2000);
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    robotRef.current?.releasePointerCapture(e.pointerId);

    if (robotRef.current) robotRef.current.style.pointerEvents = 'none';
    const droppedOn = document.elementFromPoint(e.clientX, e.clientY);
    if (robotRef.current) robotRef.current.style.pointerEvents = 'auto';

    highlightElement(droppedOn);
    
    setIsAnalyzing(true);
    const chartContext = extractDataFromElement(droppedOn);
    setContext(chartContext);

    const result = await analyzeChartContext(chartContext);
    setAnalysis(result);
    setIsAnalyzing(false);
    setShowOverlay(true);
    saveToStorage(chartContext, result);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[2147483647]">
      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        .animate-scan { animation: scan 1.5s linear infinite; }
      `}</style>

      {/* 3D Robot Widget */}
      <div
        ref={robotRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ left: position.x, top: position.y }}
        className="absolute w-20 h-20 cursor-grab active:cursor-grabbing pointer-events-auto transition-transform hover:scale-110 active:scale-95"
      >
        <RobotIcon mood={mood} />
        
        {/* History Indicator/Recall Button */}
        {hasHistory && mood === 'idle' && !showOverlay && (
          <button 
            onClick={(e) => { e.stopPropagation(); setShowOverlay(true); }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-white/90 hover:bg-white text-blue-600 text-[9px] font-bold px-3 py-1 rounded-full shadow-md border border-blue-200 pointer-events-auto whitespace-nowrap transition-all flex items-center gap-1 group"
          >
            <span className="group-hover:rotate-12 transition-transform">🕒</span> RECALL LAST
          </button>
        )}

        {isAnalyzing && (
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900/90 text-cyan-400 text-[10px] px-3 py-1.5 rounded-full shadow-xl border border-cyan-500/30 whitespace-nowrap animate-pulse flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
            SCANNING DEEP DATA...
          </div>
        )}
      </div>

      {/* Overlay Analysis Panel */}
      {showOverlay && context && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 w-96 bg-white/95 backdrop-blur-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-3xl border border-gray-100 overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 flex justify-between items-center text-white relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <svg width="100%" height="100%"><rect width="100%" height="100%" fill="url(#grid)" /></svg>
            </div>
            <h3 className="font-bold flex items-center gap-3 text-lg z-10">
              <span className="bg-white/20 p-2 rounded-xl backdrop-blur-md">📈</span> 
              <h1>Gemini TradeSense</h1>
            </h3>
            <button onClick={() => setShowOverlay(false)} className="hover:bg-white/20 p-2 rounded-xl transition-all z-10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Target Context</p>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                 <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">{context.chartType.charAt(0)}</div>
                 <div className="flex-1 overflow-hidden">
                   <p className="text-sm font-bold text-slate-800 truncate">{context.title}</p>
                   <p className="text-[10px] text-slate-400 truncate">{context.url}</p>
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">AI Report</p>
              <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100 relative">
                <div className="absolute -top-3 right-5 bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-full font-bold shadow-lg">VERIFIED INSIGHT</div>
                <p className="text-slate-700 leading-relaxed text-sm font-medium italic">"{analysis?.summary}"</p>
              </div>
              <div className="grid gap-3">
                {analysis?.insights.map((insight, idx) => (
                  <div key={idx} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-50 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0 group-hover:scale-110 transition-transform">{idx + 1}</div>
                    <p className="text-sm text-slate-600">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {(context.labels.length > 0 || context.extractedText.length > 0) && (
              <div className="space-y-3">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Detected Signals</p>
                <div className="flex flex-wrap gap-2">
                  {context.labels.map((label, idx) => (
                    <span key={`l-${idx}`} className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] border border-slate-200 font-medium">{label}</span>
                  ))}
                  {context.extractedText.map((text, idx) => (
                    <span key={`t-${idx}`} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] border border-blue-100 font-medium">{text}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
            <button 
              onClick={() => setShowOverlay(false)}
              className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95 text-sm uppercase tracking-widest"
            >
              Close Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
