import { useState } from "react";
import ReactMarkdown from "react-markdown";

import Navbar from "../../components/common/Navbar";

import {
  CaseCard,
  FilterBar,
  LegalSection,
  SearchField,
  SummaryNotice,
  UpdateCard,
  type SectionFilter,
} from "./components";

import { useDebouncedValue } from "./hooks";

import {
  askLegalIntelligence,
  type LegalIntelligenceResponse,
} from "./legalIntelligenceAgentApi";

import {
  IS_MOCK,
  legalIntelligenceSource,
} from "./source";

import {
  LAW_TYPES,
  type LegalCategory,
} from "./types";


const PAGE_SIZE = 6;


const LegalIntelligencePage = () => {
  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const search = useDebouncedValue(
    searchInput.trim(),
  );

  const [
    filter,
    setFilter,
  ] = useState<SectionFilter>(
    "all",
  );

  const [
    category,
    setCategory,
  ] = useState<
    LegalCategory | ""
  >("");


  // =========================================================
  // Legal Intelligence Agent state
  // =========================================================

  const [
    aiQuestion,
    setAiQuestion,
  ] = useState("");

  const [
    aiResult,
    setAiResult,
  ] = useState<
    LegalIntelligenceResponse | null
  >(null);

  const [
    aiLoading,
    setAiLoading,
  ] = useState(false);

  const [
    aiError,
    setAiError,
  ] = useState<
    string | null
  >(null);


  const base = {
    search:
      search || undefined,

    category:
      category || undefined,

    pageSize:
      PAGE_SIZE,
  };


  const isFiltered =
    Boolean(
      search ||
      category,
    );


  const show = (
    key: Exclude<
      SectionFilter,
      "all"
    >,
  ) =>
    filter === "all" ||
    filter === key;


  // =========================================================
  // Ask Legal AI
  // =========================================================

  const handleAskAi =
    async () => {
      const query =
        aiQuestion.trim();

      if (
        query.length < 3
      ) {
        setAiError(
          "Please enter a legal question.",
        );

        return;
      }

      setAiLoading(
        true,
      );

      setAiError(
        null,
      );

      setAiResult(
        null,
      );

      try {
        const result =
          await askLegalIntelligence(
            query,
          );

        setAiResult(
          result,
        );

      } catch (error) {
        console.error(
          "Legal Intelligence Agent request failed:",
          error,
        );

        setAiError(
          "The Legal Intelligence Agent could not process your question. Please try again.",
        );

      } finally {
        setAiLoading(
          false,
        );
      }
    };


  return (
    <div>
      <Navbar />

      <main className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">

          {/* ================================================= */}
          {/* Page Header */}
          {/* ================================================= */}

          <header className="max-w-3xl">
            <span className="font-mono text-xs uppercase tracking-widest text-gold-dark">
              Legal Intelligence
            </span>

            <h1 className="mt-3 font-display text-3xl font-semibold text-navy-900 sm:text-4xl">
              <span aria-hidden="true">
                ⚖️{" "}
              </span>

              Sri Lanka Legal Intelligence
            </h1>

            <p className="mt-4 text-slate-soft">
              Stay informed about new laws,
              court decisions, and important
              legal developments in Sri Lanka.
            </p>
          </header>


          {/* ================================================= */}
          {/* Legal Intelligence Agent */}
          {/* ================================================= */}

          <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">

            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-gold-dark">
                AI Legal Research
              </span>

              <h2 className="mt-2 font-display text-2xl font-semibold text-navy-900">
                Ask Legal AI
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-soft">
                Ask questions about Sri Lankan
                laws, Acts, regulations, court
                cases, judgments, or legal
                developments.
              </p>
            </div>


            {/* Question input */}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={
                  aiQuestion
                }
                onChange={(
                  event,
                ) =>
                  setAiQuestion(
                    event.target
                      .value,
                  )
                }
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !aiLoading
                  ) {
                    void handleAskAi();
                  }
                }}
                placeholder="Example: What law applies to cybercrime in Sri Lanka?"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-navy-900 outline-none transition placeholder:text-slate-400 focus:border-gold focus:ring-2 focus:ring-gold/20"
              />

              <button
                type="button"
                onClick={() =>
                  void handleAskAi()
                }
                disabled={
                  aiLoading
                }
                className="rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aiLoading
                  ? "Researching..."
                  : "Ask AI"}
              </button>
            </div>


            {/* Example questions */}

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "What law applies to cybercrime in Sri Lanka?",
                "Find court cases about employment termination.",
                "What are recent legal developments in Sri Lanka?",
              ].map(
                (
                  example,
                ) => (
                  <button
                    key={
                      example
                    }
                    type="button"
                    onClick={() =>
                      setAiQuestion(
                        example,
                      )
                    }
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:border-gold hover:text-navy-900"
                  >
                    {example}
                  </button>
                ),
              )}
            </div>


            {/* Error */}

            {aiError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">
                  {aiError}
                </p>
              </div>
            )}


            {/* ================================================= */}
            {/* AI Result */}
            {/* ================================================= */}

            {aiResult && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">

                {/* Result metadata */}

                <div className="flex flex-wrap items-center gap-3">

                  <span className="rounded-full bg-navy-900 px-3 py-1 text-xs font-semibold capitalize text-white">
                    {aiResult.intent.replace(
                      "_",
                      " ",
                    )}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Confidence{" "}
                    {Math.round(
                      aiResult.confidence *
                        100,
                    )}
                    %
                  </span>

                  {aiResult.requires_human_review && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      Human review recommended
                    </span>
                  )}
                </div>


                {/* AI Answer */}

                <div className="mt-5">
                  <h3 className="font-display text-lg font-semibold text-navy-900">
                    AI Legal Research Result
                  </h3>

                  <div className="mt-3 text-sm leading-7 text-slate-700">

                    <ReactMarkdown
                      components={{
                        p: ({
                          children,
                        }) => (
                          <p className="mb-3 last:mb-0">
                            {children}
                          </p>
                        ),

                        strong: ({
                          children,
                        }) => (
                          <strong className="font-semibold text-navy-900">
                            {children}
                          </strong>
                        ),

                        ul: ({
                          children,
                        }) => (
                          <ul className="mb-3 ml-5 list-disc space-y-1">
                            {children}
                          </ul>
                        ),

                        ol: ({
                          children,
                        }) => (
                          <ol className="mb-3 ml-5 list-decimal space-y-1">
                            {children}
                          </ol>
                        ),

                        li: ({
                          children,
                        }) => (
                          <li className="pl-1">
                            {children}
                          </li>
                        ),

                        h1: ({
                          children,
                        }) => (
                          <h4 className="mb-2 mt-4 text-lg font-semibold text-navy-900">
                            {children}
                          </h4>
                        ),

                        h2: ({
                          children,
                        }) => (
                          <h4 className="mb-2 mt-4 text-base font-semibold text-navy-900">
                            {children}
                          </h4>
                        ),

                        h3: ({
                          children,
                        }) => (
                          <h4 className="mb-2 mt-3 font-semibold text-navy-900">
                            {children}
                          </h4>
                        ),
                      }}
                    >
                      {
                        aiResult.answer
                      }
                    </ReactMarkdown>

                  </div>
                </div>


                {/* ================================================= */}
                {/* Relevant Laws */}
                {/* ================================================= */}

                {aiResult.laws.length >
                  0 && (
                  <div className="mt-7">

                    <h3 className="font-semibold text-navy-900">
                      Relevant Laws
                    </h3>

                    <div className="mt-3 space-y-3">

                      {aiResult.laws.map(
                        (
                          law,
                        ) => (
                          <div
                            key={
                              law.document_id ??
                              law.title
                            }
                            className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">

                              <p className="font-medium text-navy-900">
                                {
                                  law.title
                                }
                              </p>

                              {law.year && (
                                <span className="text-xs text-slate-500">
                                  {
                                    law.year
                                  }
                                </span>
                              )}
                            </div>

                            {law.summary && (
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {
                                  law.summary
                                }
                              </p>
                            )}

                            <div className="mt-3 text-xs text-slate-500">
                              Relevance:{" "}
                              {Math.round(
                                law.relevance_score *
                                  100,
                              )}
                              %
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}


                {/* ================================================= */}
                {/* Related Court Cases */}
                {/* ================================================= */}

                {aiResult.cases.length >
                  0 && (
                  <div className="mt-7">

                    <h3 className="font-semibold text-navy-900">
                      Related Court Cases
                    </h3>

                    <div className="mt-3 space-y-3">

                      {aiResult.cases.map(
                        (
                          courtCase,
                        ) => (
                          <div
                            key={
                              courtCase.case_number ??
                              courtCase.document_id ??
                              courtCase.title
                            }
                            className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4"
                          >

                            <p className="font-medium text-navy-900">
                              {
                                courtCase.title
                              }
                            </p>


                            {/* Court case metadata */}

                            <div className="mt-3 space-y-1 text-xs text-slate-500">

                              {courtCase.case_number && (
                                <p>
                                  <span className="font-semibold text-slate-600">
                                    Case:
                                  </span>{" "}
                                  {
                                    courtCase.case_number
                                  }
                                </p>
                              )}

                              {courtCase.court && (
                                <p>
                                  <span className="font-semibold text-slate-600">
                                    Court:
                                  </span>{" "}
                                  {
                                    courtCase.court
                                  }
                                </p>
                              )}

                              {courtCase.year && (
                                <p>
                                  <span className="font-semibold text-slate-600">
                                    Year:
                                  </span>{" "}
                                  {
                                    courtCase.year
                                  }
                                </p>
                              )}

                            </div>


                            {courtCase.summary && (
                              <p className="mt-3 text-sm leading-6 text-slate-600">
                                {
                                  courtCase.summary
                                }
                              </p>
                            )}

                          </div>
                        ),
                      )}

                    </div>
                  </div>
                )}


                {/* ================================================= */}
                {/* Legal Updates */}
                {/* ================================================= */}

                {aiResult.updates.length >
                  0 && (
                  <div className="mt-7">

                    <h3 className="font-semibold text-navy-900">
                      Legal Updates
                    </h3>

                    <div className="mt-3 space-y-3">

                      {aiResult.updates.map(
                        (
                          update,
                        ) => (
                          <div
                            key={
                              update.document_id ??
                              update.title
                            }
                            className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4"
                          >

                            <p className="font-medium text-navy-900">
                              {
                                update.title
                              }
                            </p>

                            {update.summary && (
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {
                                  update.summary
                                }
                              </p>
                            )}

                          </div>
                        ),
                      )}

                    </div>
                  </div>
                )}


                {/* ================================================= */}
                {/* Sources */}
                {/* ================================================= */}

                {aiResult.citations.length >
                  0 && (
                  <div className="mt-7 border-t border-slate-200 pt-5">

                    <h3 className="text-sm font-semibold text-navy-900">
                      Sources
                    </h3>

                    <div className="mt-3 space-y-2">

                      {aiResult.citations.map(
                        (
                          citation,
                          index,
                        ) => (
                          <div
                            key={`${citation.reference ?? citation.title}-${index}`}
                            className="text-sm text-slate-600"
                          >

                            <span className="font-medium text-navy-900">
                              {index + 1}.{" "}
                              {
                                citation.title
                              }
                            </span>

                            {citation.reference && (
                              <span>
                                {" "}
                                —{" "}
                                {
                                  citation.reference
                                }
                              </span>
                            )}

                            {citation.source_url && (
                              <>
                                {" "}
                                —{" "}

                                <a
                                  href={
                                    citation.source_url
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-medium text-gold-dark underline underline-offset-2"
                                >
                                  View source
                                </a>
                              </>
                            )}

                          </div>
                        ),
                      )}

                    </div>
                  </div>
                )}


                {/* ================================================= */}
                {/* Validation warnings */}
                {/* ================================================= */}

                {aiResult.validation_errors
                  .length > 0 && (

                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">

                    <p className="text-sm font-semibold text-amber-900">
                      Verification Notice
                    </p>

                    <div className="mt-2 space-y-1">

                      {aiResult.validation_errors.map(
                        (
                          error,
                        ) => (
                          <p
                            key={
                              error
                            }
                            className="text-sm text-amber-800"
                          >
                            •{" "}
                            {
                              error
                            }
                          </p>
                        ),
                      )}

                    </div>
                  </div>
                )}


                {/* Page-level disclaimer */}

                <p className="mt-6 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
                  Legal Intelligence provides
                  research and general
                  informational assistance. It
                  does not replace advice from
                  a qualified Attorney-at-Law.
                </p>

              </div>
            )}

          </section>


          {/* ================================================= */}
          {/* Existing browsing system */}
          {/* ================================================= */}

          {IS_MOCK && (
            <p className="mt-6 rounded-lg border border-gold bg-gold/10 px-4 py-2 text-sm text-navy-900">
              Development mode: showing
              placeholder data, not real legal
              information.
            </p>
          )}


          <div className="mt-10 flex flex-col gap-5">

            <SearchField
              value={
                searchInput
              }
              onChange={
                setSearchInput
              }
            />

            <FilterBar
              filter={
                filter
              }
              onFilter={
                setFilter
              }
              category={
                category
              }
              onCategory={
                setCategory
              }
            />

            <SummaryNotice />

          </div>


          {/* ================================================= */}
          {/* New Laws */}
          {/* ================================================= */}

          {show(
            "laws",
          ) && (
            <LegalSection
              icon="📜"
              title="New Laws & Legislation"
              fetchPage={
                legalIntelligenceSource
                  .listUpdates
              }
              query={{
                ...base,
                types: [
                  ...LAW_TYPES,
                ],
              }}
              isFiltered={
                isFiltered
              }
              emptyMessage="New Acts, Bills, amendments and regulations will appear here."
              renderItem={(
                item,
              ) => (
                <UpdateCard
                  item={
                    item
                  }
                />
              )}
            />
          )}


          {/* ================================================= */}
          {/* Court Cases */}
          {/* ================================================= */}

          {show(
            "cases",
          ) && (
            <LegalSection
              icon="⚖️"
              title="Court Cases"
              fetchPage={
                legalIntelligenceSource
                  .listCases
              }
              query={
                base
              }
              isFiltered={
                isFiltered
              }
              emptyMessage="Recent judgments and court decisions will appear here."
              renderItem={(
                item,
              ) => (
                <CaseCard
                  item={
                    item
                  }
                />
              )}
            />
          )}


          {/* ================================================= */}
          {/* Legal Updates */}
          {/* ================================================= */}

          {show(
            "updates",
          ) && (
            <LegalSection
              icon="📰"
              title="Legal Updates"
              fetchPage={
                legalIntelligenceSource
                  .listUpdates
              }
              query={{
                ...base,
                types: [
                  "Development",
                ],
              }}
              isFiltered={
                isFiltered
              }
              emptyMessage="Important legal developments will appear here."
              renderItem={(
                item,
              ) => (
                <UpdateCard
                  item={
                    item
                  }
                />
              )}
            />
          )}

        </div>
      </main>
    </div>
  );
};


export default LegalIntelligencePage;