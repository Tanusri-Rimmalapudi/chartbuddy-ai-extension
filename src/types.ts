export type ChartType = "SVG" | "Canvas" | "Unknown";

export interface ChartContext {
  title: string;
  url: string;
  chartType: ChartType;
  x: number;
  y: number;
  labels: string[];
  extractedText: string[];
}

export interface AnalysisResult {
  summary: string;
  insights: string[];
  confidence: number; // 0 → 1
}
