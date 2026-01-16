
export interface ChartContext {
  title: string;
  url: string;
  chartType: 'SVG' | 'Canvas' | 'Unknown';
  x: number;
  y: number;
  extractedText: string[];
  labels: string[];
}

export interface AnalysisResult {
  summary: string;
  insights: string[];
  confidence: number;
}
