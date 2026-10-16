export type LegalIntent =
  | "law"
  | "court_case"
  | "legal_update"
  | "mixed"
  | "unknown";

export interface LegalSource {
  title: string;
  source_type: string;
  source_url?: string | null;
  document_id?: string | null;
  case_number?: string | null;
  court?: string | null;
  year?: number | null;
  published_date?: string | null;
  summary?: string | null;
  content?: string | null;
  relevance_score: number;
}

export interface LegalCitation {
  title: string;
  source_url?: string | null;
  source_type?: string | null;
  reference?: string | null;
}

export interface LegalIntelligenceResponse {
  query: string;
  intent: LegalIntent;
  answer: string;
  laws: LegalSource[];
  cases: LegalSource[];
  updates: LegalSource[];
  citations: LegalCitation[];
  confidence: number;
  requires_human_review: boolean;
  validation_errors: string[];
}

const AI_BASE_URL =
  import.meta.env.VITE_AI_SERVICE_URL ?? "http://localhost:8001";

export async function askLegalIntelligence(
  query: string,
): Promise<LegalIntelligenceResponse> {
  const response = await fetch(
    `${AI_BASE_URL}/api/legal-intelligence/ask`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Legal Intelligence request failed: ${response.status}`,
    );
  }

  return response.json();
}