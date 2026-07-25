export type AIResponseType = "text" | "table" | "metrics" | "people" | "chart" | "confirmation";

export interface AIResponseBase { type: AIResponseType; title?: string; }

export interface TextResponse extends AIResponseBase { type: "text"; content: string; }

export interface TableResponse extends AIResponseBase {
  type: "table"; summary?: string; columns: string[]; rows: string[][];
  actions?: { label: string; action: string }[];
}

export interface MetricItem { label: string; value: string; trend?: string; trendDirection?: "up" | "down"; color?: string; icon?: string; }

export interface MetricsResponse extends AIResponseBase { type: "metrics"; metrics: MetricItem[]; }

export interface PersonItem { id: string; name: string; subtitle?: string; status?: string; statusColor?: string; avatar?: string; actionLabel?: string; action?: string; }

export interface PeopleResponse extends AIResponseBase { type: "people"; people: PersonItem[]; }

export interface ChartResponse extends AIResponseBase {
  type: "chart"; chartType: "line" | "bar" | "pie" | "doughnut";
  labels: string[]; datasets: { label: string; values: number[]; color?: string }[];
}

export interface ConfirmationResponse extends AIResponseBase {
  type: "confirmation"; message: string; action: string; actionLabel?: string; requiresConfirmation?: boolean;
}

export type AIResponse = TextResponse | TableResponse | MetricsResponse | PeopleResponse | ChartResponse | ConfirmationResponse;

export function parseAIResponse(input: string): AIResponse | null {
  if (!input || input.trim() === "") return null;
  const trimmed = input.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        for (const item of parsed) { if (item.type && ["text","table","metrics","people","chart","confirmation"].includes(item.type)) return item as AIResponse; }
        return null;
      }
      if (parsed.type && ["text","table","metrics","people","chart","confirmation"].includes(parsed.type)) return parsed as AIResponse;
    } catch { /* ignore JSON parse errors */ }
  }
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlock) {
    try { const parsed = JSON.parse(jsonBlock[1].trim()); if (parsed.type && ["text","table","metrics","people","chart","confirmation"].includes(parsed.type)) return parsed as AIResponse; } catch { /* ignore JSON parse errors */ }
  }
  return null;
}
