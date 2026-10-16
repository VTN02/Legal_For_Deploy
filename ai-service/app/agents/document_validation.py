"""
app/agents/document_validation.py

LangGraph nodes for document validation, completeness checking,
and document summary generation.

Nodes in this module:
  1. document_validation_node  — accept/reject a single analyzed document
  2. check_document_completeness  — check if all required docs are accepted
  3. generate_document_summary  — build and present the summary after all accepted

CRITICAL RULE: The accept/reject decision is made by Python threshold comparisons
against settings values. Gemini provides the confidence score but CANNOT override
the decision. The threshold logic in _apply_threshold() is the enforcement point.
"""

import logging
import re
from datetime import datetime, timezone

from app.config.settings import get_settings
from app.graph.state import AgentState, DocumentStatus
from app.schemas.document import DocumentAnalysis, DocumentSummaryItem, DocumentSummaryReport
from app.services.backend_client import get_backend_client
from app.services.gemini_service import get_gemini_service

logger = logging.getLogger(__name__)


# ============================================================
# Node 1: document_validation_node
# ============================================================

async def document_validation_node(state: AgentState) -> AgentState:
    """
    Applies confidence thresholds to the latest DocumentAnalysis and
    decides: ACCEPTED | ACCEPTED_WITH_FLAG | REJECTED | HUMAN_REVIEW.

    Updates backend file status.
    Generates rejection message if rejected.
    """
    state = dict(state)
    settings = get_settings()
    backend = get_backend_client()
    gemini = get_gemini_service()

    # Find the document that was just analyzed
    target_doc_type = None
    for doc_type, doc_status in state["document_statuses"].items():
        if doc_status["status"] == "analyzing" and doc_status.get("last_analysis"):
            target_doc_type = doc_type
            break

    if not target_doc_type:
        logger.warning("validation_node: no analyzing doc found. session=%s", state["session_id"])
        return state

    doc_status = state["document_statuses"][target_doc_type]
    file_id = doc_status["file_id"]
    analysis = DocumentAnalysis(**doc_status["last_analysis"])

    # ---- Apply threshold (the core decision logic) ----
    decision = _apply_threshold(analysis, expected_type=target_doc_type, settings=settings)

    logger.info(
        "Validation: doc=%s confidence=%.2f readable=%s detected=%s → %s",
        target_doc_type,
        analysis.classification_confidence,
        analysis.readable,
        analysis.document_type,
        decision,
    )

    if decision == "ACCEPTED":
        doc_status["status"] = "accepted"
        try:
            await backend.update_file_status(file_id, "Accepted")
        except Exception as e:
            logger.warning("Could not update file status to Accepted: %s", e)

        state["last_validated_doc_type"] = target_doc_type

        # Compute remaining missing documents
        missing = [
            d for d in state["required_documents"]
            if d != target_doc_type and state["document_statuses"].get(d, {}).get("status") not in ("accepted", "accepted_with_flag")
        ]
        if missing:
            state["phase"] = "WAITING_FOR_DOCUMENTS"
            balance_numbered = "\n".join(f"{i}. **{d}**" for i, d in enumerate(missing, start=1))
            client_msg = (
                f"✅ You uploaded **{target_doc_type}**, and it has been **Accepted**! 📄✨\n\n"
                f"📋 **Balance Documents Required ({len(missing)} remaining):**\n"
                f"{balance_numbered}\n\n"
                f"Please tap a button below to upload your balance document(s):"
            )
            upload_opts = [f"📄 Upload {d}" for d in missing]
            _add_message(state, "agent", client_msg, action_options=upload_opts)
        else:
            state["phase"] = "DOCUMENTS_COMPLETE"
            client_msg = f"✅ You uploaded **{target_doc_type}**, and it has been **Accepted**! 🎉 All required documents have been received."
            _add_message(state, "agent", client_msg)

        _append_audit(state, "DOCUMENT_ACCEPTED", target_doc_type,
                      f"confidence={analysis.classification_confidence:.2f}", "ACCEPTED")

    elif decision == "ACCEPTED_WITH_FLAG":
        doc_status["status"] = "accepted_with_flag"
        try:
            await backend.update_file_status(file_id, "Accepted")
        except Exception as e:
            logger.warning("Could not update file status to Accepted (flagged): %s", e)

        state["last_validated_doc_type"] = target_doc_type
        flag_note = (
            f" Note: {', '.join(analysis.issues)}" if analysis.issues else ""
        )
        missing = [
            d for d in state["required_documents"]
            if d != target_doc_type and state["document_statuses"].get(d, {}).get("status") not in ("accepted", "accepted_with_flag")
        ]
        if missing:
            state["phase"] = "WAITING_FOR_DOCUMENTS"
            balance_numbered = "\n".join(f"{i}. **{d}**" for i, d in enumerate(missing, start=1))
            client_msg = (
                f"⚠️ You uploaded **{target_doc_type}**, and it has been **Accepted with a note**.{flag_note}\n\n"
                f"📋 **Balance Documents Required ({len(missing)} remaining):**\n"
                f"{balance_numbered}\n\n"
                f"Please tap a button below to upload your balance document(s):"
            )
            upload_opts = [f"📄 Upload {d}" for d in missing]
            _add_message(state, "agent", client_msg, action_options=upload_opts)
        else:
            state["phase"] = "DOCUMENTS_COMPLETE"
            client_msg = (
                f"⚠️ You uploaded **{target_doc_type}**, and it has been **Accepted with a note**.{flag_note} "
                "All required documents have been received."
            )
            _add_message(state, "agent", client_msg)

        _append_audit(state, "DOCUMENT_ACCEPTED_FLAGGED", target_doc_type,
                      f"confidence={analysis.classification_confidence:.2f} issues={analysis.issues}",
                      "ACCEPTED_WITH_FLAG")

    elif decision == "REJECTED":
        state["phase"] = "WAITING_FOR_DOCUMENTS"
        state["last_validated_doc_type"] = target_doc_type
        doc_status["retry_count"] = doc_status.get("retry_count", 0) + 1
        retry_count = doc_status["retry_count"]

        # Check if max retries exceeded AFTER incrementing
        if retry_count >= settings.max_reupload_attempts_per_document:
            doc_status["status"] = "rejected"
            state["human_review_triggered"] = True
            state["human_review_reason"] = (
                f"{target_doc_type} could not be verified after "
                f"{retry_count} attempts."
            )
            try:
                await backend.update_file_status(file_id, "Rejected")
            except Exception as e:
                logger.warning("Could not update file status to Rejected: %s", e)

            client_msg = (
                f"⚠️ You uploaded **{target_doc_type}**, but it was **Not Accepted** "
                f"after {retry_count} attempts. A staff member will review it manually "
                "and contact you within 1-2 business days. Your other documents have been saved."
            )
            _add_message(state, "agent", client_msg)
            _append_audit(state, "DOCUMENT_ESCALATED", target_doc_type,
                          f"max_retries={settings.max_reupload_attempts_per_document} exceeded",
                          "HUMAN_REVIEW")
        else:
            doc_status["status"] = "rejected"
            try:
                await backend.update_file_status(file_id, "Rejected")
            except Exception as e:
                logger.warning("Could not update file status to Rejected: %s", e)

            # Generate specific rejection message
            rejection_msg = await gemini.generate_rejection_message(
                analysis=analysis,
                expected_doc_type=target_doc_type,
                retry_count=retry_count,
                max_retries=settings.max_reupload_attempts_per_document,
            )
            doc_status["rejection_reason"] = rejection_msg

            detected_info = ""
            if analysis.document_type and analysis.document_type.lower() not in ("unknown", target_doc_type.lower()):
                detected_info = f" *(Detected as: {analysis.document_type})*"

            issues_bullets = ""
            if analysis.issues:
                issues_bullets = "\n" + "\n".join(f"• {iss}" for iss in analysis.issues)

            client_msg = (
                f"❌ You uploaded **{target_doc_type}**, and it was **Not Accepted**.{detected_info}\n\n"
                f"**Reason for Rejection:**\n"
                f"{rejection_msg}{issues_bullets}\n\n"
                f"**How to Fix:**\n"
                f"1. Make sure all corners and edges of your **{target_doc_type}** are fully visible.\n"
                f"2. Ensure good lighting so all text, stamps, and signatures are crisp and legible.\n"
                f"3. Upload a standard PDF or high-resolution PNG/JPEG file.\n\n"
                f"👉 *Please tap below to re-upload your verified **{target_doc_type}** (Attempt {retry_count} of {settings.max_reupload_attempts_per_document})*"
            )
            _add_message(state, "agent", client_msg, action_options=[f"📄 Upload {target_doc_type}"])
            _append_audit(state, "DOCUMENT_REJECTED", target_doc_type,
                          f"confidence={analysis.classification_confidence:.2f} "
                          f"issues={analysis.issues} retry={retry_count}",
                          "REJECTED")

    elif decision == "HUMAN_REVIEW":
        doc_status["status"] = "rejected"
        state["human_review_triggered"] = True
        state["last_validated_doc_type"] = target_doc_type
        state["human_review_reason"] = (
            f"{target_doc_type} analysis could not be completed reliably."
        )
        client_msg = (
            f"⚠️ You uploaded **{target_doc_type}**, but we are having trouble automatically processing it.\n\n"
            "**Next Step:**\n"
            "• A legal clerk will review your file manually within 1 business day.\n"
            "• You do not need to re-upload at this time."
        )
        _add_message(state, "agent", client_msg)
        _append_audit(state, "DOCUMENT_HUMAN_REVIEW", target_doc_type,
                      f"analysis_summary={analysis.analysis_summary}", "HUMAN_REVIEW")

    state["document_statuses"][target_doc_type] = doc_status
    return state


SYNONYM_CLUSTERS = [
    # 1. Address Proof / Premises Proof
    {
        "address", "addressing", "premises", "premise", "utility bill",
        "residence", "residential", "assessment certificate", "rates receipt",
        "registered address", "office address", "proof of address", "address proof",
    },
    # 2. National Identity / NIC / Signatory ID
    {
        "nic", "national identity", "identity card", "identity proof",
        "passport", "signatory", "surety", "deponent", "testator", "id copy", "nic copy",
    },
    # 3. Form 1 / Form 18 / Business Registration
    {
        "form 1", "form 18", "business registration", "incorporation form",
        "br form", "company registration", "certificate of incorporation",
    },
    # 4. Articles of Association
    {
        "articles of association", "articles of incorporation", "aoa",
        "constitution", "memorandum", "company articles",
    },
    # 5. Tenancy & Commercial Lease
    {
        "tenancy", "lease", "rent", "rental", "commercial lease", "lease agreement", "tenancy agreement",
    },
    # 6. Title Deed / Property Proof
    {
        "title deed", "property deed", "prior title deed", "deed copy",
        "ownership proof", "asset ownership", "land registry", "conveyance", "deed of transfer",
    },
    # 7. Cadastral Survey Plan
    {
        "survey plan", "cadastral", "surveyor plan", "boundary plan", "land plan", "cadastral survey",
    },
    # 8. Sale Agreement Draft
    {
        "sale agreement", "purchase agreement", "agreement to sell", "sale and purchase", "property sale draft",
    },
    # 9. Power of Attorney / Proxy Authorization
    {
        "power of attorney", "poa", "attorney draft", "proxy authorization", "proxy appointment",
        "scope of authority", "proxy",
    },
    # 10. Last Will and Testament
    {
        "will", "testament", "last will", "probate", "testamentary", "draft will agreement",
    },
    # 11. Affidavits & Sworn Declarations
    {
        "affidavit", "sworn statement", "deponent declaration", "sworn affidavit", "fact affidavit",
    },
    # 12. Grama Niladhari / Residence Certificate
    {
        "grama", "niladhari", "gn certificate", "residence certificate", "grama sewaka",
    },
    # 13. Invoices / Claim Evidence
    {
        "claim evidence", "invoice", "invoices", "billing statement", "debt evidence", "unpaid claim",
    },
    # 14. Contract & Corporate Agreements
    {
        "contract", "commercial agreement", "original contract", "legal agreement", "corporate agreement",
    },
    # 15. Formal Letters / Demand Notices
    {
        "amendment request", "request letter", "formal letter", "demand notice", "notice letter", "opposing party service address",
    },
    # 16. Witness Details
    {
        "witness", "witness details", "witness statement", "beneficiary details",
    },
]


def _normalize_doc_type_text(text: str) -> str:
    """Normalizes document type strings by lowercasing, stripping punctuation, and basic stemming."""
    t = (text or "").lower()
    t = re.sub(r"[\(\)\[\]\{\}\/\\,_\-\.:;+&]", " ", t)
    t = re.sub(r"\baddressing\b", "address", t)
    t = re.sub(r"\bregistered\b", "register", t)
    t = re.sub(r"\bregistration\b", "register", t)
    t = re.sub(r"\bassociating\b", "association", t)
    return re.sub(r"\s+", " ", t).strip()


def _is_document_type_match(detected: str, expected: str) -> bool:
    """
    Determines whether a detected document type satisfies the expected document requirement.
    Handles transposed word order ('Proof of Address' vs 'Address Proof'), common legal aliases,
    morphology ('addressing' vs 'address'), and synonym clusters.
    """
    if not detected or not expected:
        return False

    d_norm = _normalize_doc_type_text(detected)
    e_norm = _normalize_doc_type_text(expected)

    if not d_norm or not e_norm:
        return False

    # 1. Exact equality after normalization
    if d_norm == e_norm:
        return True

    # 2. Substring match if meaningful length
    if len(d_norm) >= 4 and len(e_norm) >= 4:
        if d_norm in e_norm or e_norm in d_norm:
            return True

    # 3. Token intersection ignoring noise words
    noise = {"of", "the", "a", "an", "and", "or", "for", "to", "in", "copy", "draft", "proof", "document", "form", "certificate"}
    d_words = set(d_norm.split()) - noise
    e_words = set(e_norm.split()) - noise
    if d_words and e_words and (d_words & e_words):
        return True

    # 4. Synonym cluster matching
    for cluster in SYNONYM_CLUSTERS:
        d_match = any(_normalize_doc_type_text(term) in d_norm or d_norm in _normalize_doc_type_text(term) for term in cluster)
        e_match = any(_normalize_doc_type_text(term) in e_norm or e_norm in _normalize_doc_type_text(term) for term in cluster)
        if d_match and e_match:
            return True

    return False


def _apply_threshold(
    analysis: DocumentAnalysis,
    expected_type: str,
    settings,
) -> str:
    """
    The ONLY place where confidence thresholds are applied.
    Gemini cannot influence this function — it only reads settings values
    and the structured fields from DocumentAnalysis.

    Returns: ACCEPTED | ACCEPTED_WITH_FLAG | REJECTED | HUMAN_REVIEW
    """
    confidence = analysis.classification_confidence

    # Type matching check with robust semantic & synonym cluster support
    type_matches = _is_document_type_match(analysis.document_type, expected_type)

    if not analysis.readable:
        if not any("readable" in iss.lower() or "blurry" in iss.lower() for iss in analysis.issues):
            analysis.issues.append("Document image/text is unreadable or blurry. Key legal details cannot be examined.")
        return "REJECTED"

    if not type_matches:
        det = analysis.document_type or "unrecognized document"
        if not any("mismatch" in iss.lower() for iss in analysis.issues):
            analysis.issues.append(
                f"Document type mismatch: The uploaded file was identified as '{det}', but this step specifically requires '{expected_type}'."
            )
        return "REJECTED"

    if confidence >= settings.high_confidence_threshold:
        return "ACCEPTED"
    elif confidence >= settings.medium_confidence_threshold:
        return "ACCEPTED_WITH_FLAG"
    else:
        if not any("confidence" in iss.lower() or "authenticity" in iss.lower() for iss in analysis.issues):
            analysis.issues.append(
                f"Document verification confidence ({confidence:.0%}) is below the required legal threshold ({settings.medium_confidence_threshold:.0%}) for an authentic {expected_type}."
            )
        return "REJECTED"


# ============================================================
# Node 2: check_document_completeness
# ============================================================

async def check_document_completeness(state: AgentState) -> AgentState:
    """
    Checks whether all required documents have been accepted.
    Updates state phase accordingly.
    If documents are missing, tells the client which ones are needed.
    """
    state = dict(state)
    statuses = state["document_statuses"]
    required = state["required_documents"]

    missing = []
    for doc_type in required:
        doc_status = statuses.get(doc_type)
        if not doc_status or doc_status["status"] not in ("accepted", "accepted_with_flag"):
            missing.append(doc_type)

    if missing:
        state["phase"] = "WAITING_FOR_DOCUMENTS"
        messages = state.get("messages", [])
        last_agent_content = ""
        for m in reversed(messages):
            if m.get("role") == "agent":
                last_agent_content = m.get("content", "")
                break

        has_feedback = any(
            last_agent_content.startswith(prefix)
            for prefix in ("✅", "⚠️", "❌", "We're having trouble")
        )
        if not has_feedback:
            missing_numbered = "\n".join(f"{i}. **{d}**" for i, d in enumerate(missing, start=1))
            client_msg = (
                f"📋 **Balance Documents Required ({len(missing)} remaining):**\n"
                f"{missing_numbered}\n\n"
                f"👉 *Please tap below to upload your balance document(s):*"
            )
            upload_opts = [f"📄 Upload {d}" for d in missing]
            _add_message(state, "agent", client_msg, action_options=upload_opts)

        logger.info(
            "Completeness check: missing=%s session=%s",
            missing, state["session_id"],
        )
    else:
        state["phase"] = "DOCUMENTS_COMPLETE"
        logger.info(
            "Completeness check: all %d documents accepted. session=%s",
            len(required), state["session_id"],
        )

    return state


# ============================================================
# Node 3: generate_document_summary
# ============================================================

async def generate_document_summary(state: AgentState) -> AgentState:
    """
    Generates and presents the full document verification summary to the client.
    Runs immediately after all documents are accepted (check_document_completeness → DOCUMENTS_COMPLETE).
    Updates backend request status to UNDER_REVIEW.
    """
    state = dict(state)
    settings = get_settings()
    backend = get_backend_client()
    gemini = get_gemini_service()

    statuses = state["document_statuses"]
    required = state["required_documents"]

    # Build the summary items
    summary_items: list[DocumentSummaryItem] = []
    total_flagged = 0

    for doc_type in required:
        doc_status = statuses.get(doc_type, {})
        analysis_dict = doc_status.get("last_analysis") or {}

        confidence = analysis_dict.get("classification_confidence", 0.0)
        extracted = list(analysis_dict.get("extracted_fields", {}).keys())
        issues = analysis_dict.get("issues", [])
        flagged = doc_status.get("status") == "accepted_with_flag"
        if flagged:
            total_flagged += 1

        item = DocumentSummaryItem(
            doc_type=doc_type,
            status=doc_status.get("status", "unknown"),
            confidence_percent=round(confidence * 100),
            verified_fields=extracted,
            attempts=(doc_status.get("retry_count", 0) + 1),
            flagged=flagged,
            flag_reason=", ".join(issues) if flagged and issues else None,
        )
        summary_items.append(item)

    report = DocumentSummaryReport(
        service_name=state["service_name"],
        request_id=state.get("request_id") or 0,
        total_required=len(required),
        total_accepted=len(required),
        total_flagged=total_flagged,
        documents=summary_items,
        ready_for_assignment=True,
        summary_message="",  # filled below
    )

    # Generate the friendly client-facing message
    summary_message = await gemini.generate_document_summary_message(report)
    report.summary_message = summary_message

    # Store in state
    state["document_summary"] = report.model_dump()
    _add_message(state, "agent", summary_message)

    # Update backend request status
    if state.get("request_id"):
        try:
            await backend.update_request_status(state["request_id"], "UNDER_REVIEW")
        except Exception as e:
            logger.warning("Could not update request status to UNDER_REVIEW: %s", e)

    _append_audit(
        state, "DOCUMENT_SUMMARY_GENERATED", None,
        f"total={len(required)} flagged={total_flagged}",
        "DOCUMENTS_COMPLETE",
    )
    logger.info(
        "Document summary generated: total=%d flagged=%d session=%s",
        len(required), total_flagged, state["session_id"],
    )

    return state


# ============================================================
# Helpers
# ============================================================

def _add_message(state: dict, role: str, content: str, action_options: list[str] | None = None) -> None:
    msg: dict = {
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if action_options:
        msg["action_options"] = action_options
        state["pending_action_options"] = action_options
    state["messages"].append(msg)


def _append_audit(
    state: dict,
    event: str,
    doc_type: str | None,
    reason: str,
    decision: str,
) -> None:
    state["audit_log"].append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_id": state.get("session_id"),
        "workflow_id": state.get("workflow_id"),
        "request_id": state.get("request_id"),
        "event": event,
        "doc_type": doc_type,
        "reason": reason,
        "decision": decision,
    })
