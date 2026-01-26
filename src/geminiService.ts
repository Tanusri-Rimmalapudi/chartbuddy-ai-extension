/// <reference types="chrome" />

import { ChartContext, AnalysisResult } from "./types";

/**
 * Sends chart context to background service worker (performs Gemini analysis)n
 */
export const analyzeChartContext = (
  context: ChartContext
): Promise<AnalysisResult> => {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime?.sendMessage) {
      reject(new Error("Chrome runtime not available"));
      return;
    }

    chrome.runtime.sendMessage(
      {
        type: "ANALYZE_CHART",
        payload: context
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response || !response.success) {
          reject(new Error(response?.error || "AI analysis failed"));
          return;
        }

        resolve(response.result as AnalysisResult);
      }
    );
  });
};
