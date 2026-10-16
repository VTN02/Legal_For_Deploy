import axios from "axios";

import type {
  CourtCase,
  LegalCategory,
  LegalIntelligenceSource,
  LegalUpdate,
  LegalUpdateStatus,
  LegalUpdateType,
  ListQuery,
  Paginated,
} from "../features/legal-intelligence/types";


// ============================================================
// AI service configuration
// ============================================================

const AI_BASE_URL =
  import.meta.env.VITE_AI_SERVICE_URL ??
  "http://localhost:8001";


// ============================================================
// FastAPI response shapes
// ============================================================

interface LegalLawApiResponse {
  id: string;
  title: string;
  document_type: string;
  act_number?: string | null;
  published_date?: string | null;
  official_url?: string | null;
  summary?: string | null;
  source_name: string;
  external_id?: string | null;
  is_published: boolean;
}

interface CourtCaseApiResponse {
  id: string;
  case_number: string;
  title: string;
  decision_type: string;
  court: string;
  decision_date?: string | null;
  judge?: string | null;
  keywords?: string | null;
  legislation?: string | null;
  source_name: string;
  source_url?: string | null;
  is_published: boolean;
}


// ============================================================
// Legal law mapping helpers
// ============================================================

function mapDocumentType(
  documentType: string,
  title: string,
): LegalUpdateType {
  const text = `
    ${documentType}
    ${title}
  `.toLowerCase();

  if (text.includes("amendment")) {
    return "Amendment";
  }

  if (text.includes("bill")) {
    return "Bill";
  }

  if (text.includes("regulation")) {
    return "Regulation";
  }

  return "Act";
}


function mapCategory(
  document: LegalLawApiResponse,
): LegalCategory {
  const text = `
    ${document.title}
    ${document.document_type}
    ${document.summary ?? ""}
  `.toLowerCase();

  if (
    text.includes("constitution") ||
    text.includes("judicature")
  ) {
    return "Constitutional";
  }

  if (
    text.includes("criminal") ||
    text.includes("terrorist") ||
    text.includes("money laundering") ||
    text.includes("crime")
  ) {
    return "Criminal";
  }

  if (
    text.includes("employment") ||
    text.includes("labour") ||
    text.includes("labor") ||
    text.includes("women") ||
    text.includes("young persons")
  ) {
    return "Employment";
  }

  if (
    text.includes("commercial") ||
    text.includes("company") ||
    text.includes("corporate") ||
    text.includes("business")
  ) {
    return "Commercial";
  }

  if (text.includes("tax")) {
    return "Tax";
  }

  if (
    text.includes("property") ||
    text.includes("land") ||
    text.includes("lease")
  ) {
    return "Property";
  }

  if (
    text.includes("family") ||
    text.includes("divorce") ||
    text.includes("custody")
  ) {
    return "Family";
  }

  if (
    text.includes("environment") ||
    text.includes("animal")
  ) {
    return "Environmental";
  }

  if (text.includes("civil")) {
    return "Civil";
  }

  return "Other";
}


function mapStatus(
  document: LegalLawApiResponse,
): LegalUpdateStatus {
  if (
    document.document_type
      .toLowerCase()
      .includes("bill")
  ) {
    return "Proposed";
  }

  return "Enacted";
}


function mapLegalLawToUpdate(
  document: LegalLawApiResponse,
): LegalUpdate {
  return {
    id: document.id,

    title: document.title,

    type: mapDocumentType(
      document.document_type,
      document.title,
    ),

    category: mapCategory(
      document,
    ),

    summary:
      document.summary?.trim() ||
      `Official Sri Lankan legislation published by ${document.source_name}.`,

    publishedDate:
      document.published_date ||
      new Date().toISOString(),

    sourceName:
      document.source_name,

    sourceUrl:
      document.official_url || "",

    status:
      mapStatus(document),

    related: [],
  };
}


// ============================================================
// Court case mapping helpers
// ============================================================

function mapCourtCaseCategory(
  document: CourtCaseApiResponse,
): LegalCategory {
  const text = `
    ${document.title}
    ${document.case_number}
    ${document.decision_type}
    ${document.keywords ?? ""}
    ${document.legislation ?? ""}
  `.toLowerCase();

  if (
    text.includes("constitution") ||
    text.includes("jurisdiction")
  ) {
    return "Constitutional";
  }

  if (
    text.includes("bail") ||
    text.includes("criminal") ||
    text.includes("dangerous drugs") ||
    text.includes("poisons") ||
    text.includes("opium") ||
    text.includes("attorney general")
  ) {
    return "Criminal";
  }

  if (
    text.includes("employment") ||
    text.includes("labour") ||
    text.includes("labor") ||
    text.includes("termination")
  ) {
    return "Employment";
  }

  if (
    text.includes("tax") ||
    text.includes("inland revenue")
  ) {
    return "Tax";
  }

  if (
    text.includes("commercial") ||
    text.includes("company") ||
    text.includes("corporate") ||
    text.includes("business") ||
    text.includes("bank")
  ) {
    return "Commercial";
  }

  if (
    text.includes("property") ||
    text.includes("land") ||
    text.includes("lease")
  ) {
    return "Property";
  }

  if (
    text.includes("family") ||
    text.includes("divorce") ||
    text.includes("custody")
  ) {
    return "Family";
  }

  if (
    text.includes("environment") ||
    text.includes("environmental")
  ) {
    return "Environmental";
  }

  if (text.includes("civil")) {
    return "Civil";
  }

  return "Other";
}


function formatDecisionType(
  decisionType: string,
): string {
  const normalized =
    decisionType.trim().toLowerCase();

  if (!normalized) {
    return "Decision";
  }

  return (
    normalized.charAt(0).toUpperCase() +
    normalized.slice(1)
  );
}


function mapCourtCase(
  document: CourtCaseApiResponse,
): CourtCase {
  const details: string[] = [];

  if (document.judge?.trim()) {
    details.push(
      `Judge: ${document.judge.trim()}`,
    );
  }

  if (document.keywords?.trim()) {
    details.push(
      `Keywords: ${document.keywords.trim()}`,
    );
  }

  if (document.legislation?.trim()) {
    details.push(
      `Legislation: ${document.legislation.trim()}`,
    );
  }

  const decisionType =
    formatDecisionType(
      document.decision_type,
    );

  return {
    id: document.id,

    caseNumber:
      document.case_number,

    title:
      document.title.trim(),

    court:
      document.court,

    decisionDate:
      document.decision_date ||
      new Date().toISOString(),

    category:
      mapCourtCaseCategory(
        document,
      ),

    summary:
      document.keywords?.trim() ||
      `${decisionType} published by ${document.source_name}.`,

    details:
      details.length > 0
        ? details.join("\n")
        : undefined,

    decision:
      decisionType,

    sourceName:
      document.source_name,

    sourceUrl:
      document.source_url || "",

    related: [],
  };
}


// ============================================================
// Update filtering
// ============================================================

function filterUpdates(
  updates: LegalUpdate[],
  query: ListQuery,
): LegalUpdate[] {
  let result = [...updates];

  if (query.search?.trim()) {
    const search =
      query.search
        .trim()
        .toLowerCase();

    result = result.filter(
      (item) =>
        [
          item.title,
          item.summary,
          item.details ?? "",
          item.category,
          item.type,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search),
    );
  }

  if (query.category) {
    result = result.filter(
      (item) =>
        item.category ===
        query.category,
    );
  }

  if (
    query.types &&
    query.types.length > 0
  ) {
    result = result.filter(
      (item) =>
        query.types!.includes(
          item.type,
        ),
    );
  }

  return result;
}


// ============================================================
// Court case filtering
// ============================================================

function filterCases(
  cases: CourtCase[],
  query: ListQuery,
): CourtCase[] {
  let result = [...cases];

  if (query.search?.trim()) {
    const search =
      query.search
        .trim()
        .toLowerCase();

    result = result.filter(
      (item) =>
        [
          item.caseNumber,
          item.title,
          item.court,
          item.summary,
          item.details ?? "",
          item.decision ?? "",
          item.category,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search),
    );
  }

  if (query.category) {
    result = result.filter(
      (item) =>
        item.category ===
        query.category,
    );
  }

  return result;
}


// ============================================================
// Pagination
// ============================================================

function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): Paginated<T> {
  const start =
    (page - 1) * pageSize;

  const end =
    start + pageSize;

  return {
    items:
      items.slice(
        start,
        end,
      ),

    total:
      items.length,

    page,

    pageSize,
  };
}


// ============================================================
// API
// ============================================================

export const legalIntelligenceApi:
  LegalIntelligenceSource = {

  // ----------------------------------------------------------
  // Validated Parliament Acts
  // ----------------------------------------------------------

  listUpdates: async (
    query,
    signal,
  ): Promise<
    Paginated<LegalUpdate>
  > => {
    const response =
      await axios.get<
        LegalLawApiResponse[]
      >(
        `${AI_BASE_URL}/api/legal-intelligence/laws`,
        {
          signal,
        },
      );

    const updates =
      response.data
        .filter(
          (document) =>
            document.is_published,
        )
        .map(
          mapLegalLawToUpdate,
        )
        .sort(
          (a, b) =>
            new Date(
              b.publishedDate,
            ).getTime() -
            new Date(
              a.publishedDate,
            ).getTime(),
        );

    const filtered =
      filterUpdates(
        updates,
        query,
      );

    const page =
      query.page ?? 1;

    const pageSize =
      query.pageSize ?? 6;

    return paginate(
      filtered,
      page,
      pageSize,
    );
  },


  getUpdate: async (
    id,
    signal,
  ): Promise<LegalUpdate> => {
    const response =
      await axios.get<
        LegalLawApiResponse[]
      >(
        `${AI_BASE_URL}/api/legal-intelligence/laws`,
        {
          signal,
        },
      );

    const document =
      response.data.find(
        (item) =>
          item.id === id,
      );

    if (!document) {
      throw new Error(
        `Legal document '${id}' was not found.`,
      );
    }

    return mapLegalLawToUpdate(
      document,
    );
  },


  // ----------------------------------------------------------
  // Validated Court of Appeal cases
  // ----------------------------------------------------------

  listCases: async (
    query,
    signal,
  ): Promise<
    Paginated<CourtCase>
  > => {
    const response =
      await axios.get<
        CourtCaseApiResponse[]
      >(
        `${AI_BASE_URL}/api/legal-intelligence/cases`,
        {
          signal,
        },
      );

    const cases =
      response.data
        .filter(
          (document) =>
            document.is_published,
        )
        .map(
          mapCourtCase,
        )
        .sort(
          (a, b) =>
            new Date(
              b.decisionDate,
            ).getTime() -
            new Date(
              a.decisionDate,
            ).getTime(),
        );

    const filtered =
      filterCases(
        cases,
        query,
      );

    const page =
      query.page ?? 1;

    const pageSize =
      query.pageSize ?? 6;

    return paginate(
      filtered,
      page,
      pageSize,
    );
  },


  getCase: async (
    id,
    signal,
  ): Promise<CourtCase> => {
    const response =
      await axios.get<
        CourtCaseApiResponse[]
      >(
        `${AI_BASE_URL}/api/legal-intelligence/cases`,
        {
          signal,
        },
      );

    const document =
      response.data.find(
        (item) =>
          item.id === id,
      );

    if (!document) {
      throw new Error(
        `Court case '${id}' was not found.`,
      );
    }

    return mapCourtCase(
      document,
    );
  },
};