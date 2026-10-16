using System.Security.Cryptography;
using System.Text;
using LegalService.API.Data;
using LegalService.API.Models.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/legal-intelligence-data")]
public class LegalIntelligenceDataController : ControllerBase
{
    private const string AiServiceHeaderName = "X-AI-Service-Key";

    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public LegalIntelligenceDataController(
        ApplicationDbContext context,
        IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    // ============================================================
    // AI SERVICE AUTHENTICATION
    // ============================================================

    private string? GetExpectedAiServiceKey()
    {
        return _configuration["AI_SERVICE_API_KEY"];
    }

    private bool IsValidAiServiceRequest()
    {
        var expectedKey = GetExpectedAiServiceKey();

        if (string.IsNullOrWhiteSpace(expectedKey))
        {
            return false;
        }

        if (!Request.Headers.TryGetValue(
                AiServiceHeaderName,
                out var providedHeader))
        {
            return false;
        }

        var providedKey = providedHeader.ToString();

        if (string.IsNullOrWhiteSpace(providedKey))
        {
            return false;
        }

        var expectedBytes = Encoding.UTF8.GetBytes(
            expectedKey);

        var providedBytes = Encoding.UTF8.GetBytes(
            providedKey);

        if (expectedBytes.Length != providedBytes.Length)
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(
            expectedBytes,
            providedBytes);
    }

    private ActionResult? ValidateAiServiceRequest()
    {
        var expectedKey = GetExpectedAiServiceKey();

        if (string.IsNullOrWhiteSpace(expectedKey))
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new
                {
                    message = "AI service authentication is not configured."
                });
        }

        if (!IsValidAiServiceRequest())
        {
            return Unauthorized(
                new
                {
                    message = "AI service authentication failed."
                });
        }

        return null;
    }


    // ============================================================
    // LEGAL DOCUMENTS
    // ============================================================

    [HttpGet("documents")]
    public async Task<
        ActionResult<IEnumerable<LegalIntelligenceDocument>>>
        GetDocuments()
    {
        var documents = await _context
            .LegalIntelligenceDocuments
            .AsNoTracking()
            .Where(x =>
                x.IsPublished &&
                x.IsVerified)
            .OrderByDescending(
                x => x.PublishedDate)
            .ToListAsync();

        return Ok(documents);
    }


    [HttpPost("documents")]
    public async Task<
        ActionResult<LegalIntelligenceDocument>>
        UpsertDocument(
            LegalIntelligenceDocument document)
    {
        var authResult = ValidateAiServiceRequest();

        if (authResult != null)
        {
            return authResult;
        }

        LegalIntelligenceDocument? existing = null;

        if (!string.IsNullOrWhiteSpace(
                document.ExternalId))
        {
            existing = await _context
                .LegalIntelligenceDocuments
                .FirstOrDefaultAsync(
                    x =>
                        x.ExternalId ==
                        document.ExternalId);
        }

        if (existing == null)
        {
            document.Id = 0;
            document.CreatedAt = DateTime.UtcNow;
            document.UpdatedAt = DateTime.UtcNow;

            _context
                .LegalIntelligenceDocuments
                .Add(document);
        }
        else
        {
            existing.Title =
                document.Title;

            existing.DocumentType =
                document.DocumentType;

            existing.ActNumber =
                document.ActNumber;

            existing.Year =
                document.Year;

            existing.PublishedDate =
                document.PublishedDate;

            existing.OfficialUrl =
                document.OfficialUrl;

            existing.DetailUrl =
                document.DetailUrl;

            existing.SourceName =
                document.SourceName;

            existing.SourceDomain =
                document.SourceDomain;

            existing.SourceTrustLevel =
                document.SourceTrustLevel;

            existing.RawText =
                document.RawText;

            existing.Summary =
                document.Summary;

            existing.Metadata =
                document.Metadata;

            existing.IsVerified =
                document.IsVerified;

            existing.IsPublished =
                document.IsPublished;

            existing.UpdatedAt =
                DateTime.UtcNow;

            document = existing;
        }

        await _context.SaveChangesAsync();

        return Ok(document);
    }


    // ============================================================
    // COURT CASES
    // ============================================================

    [HttpGet("court-cases")]
    public async Task<
        ActionResult<IEnumerable<LegalIntelligenceCourtCase>>>
        GetCourtCases()
    {
        var cases = await _context
            .LegalIntelligenceCourtCases
            .AsNoTracking()
            .Where(x =>
                x.IsPublished &&
                x.IsVerified)
            .OrderByDescending(
                x => x.DecisionDate)
            .ToListAsync();

        return Ok(cases);
    }


    [HttpPost("court-cases")]
    public async Task<
        ActionResult<LegalIntelligenceCourtCase>>
        UpsertCourtCase(
            LegalIntelligenceCourtCase courtCase)
    {
        var authResult = ValidateAiServiceRequest();

        if (authResult != null)
        {
            return authResult;
        }

        var existing = await _context
            .LegalIntelligenceCourtCases
            .FirstOrDefaultAsync(
                x =>
                    x.Court ==
                    courtCase.Court &&
                    x.DecisionType ==
                    courtCase.DecisionType &&
                    x.CaseNumber ==
                    courtCase.CaseNumber &&
                    x.DecisionDate ==
                    courtCase.DecisionDate);

        if (existing == null)
        {
            courtCase.Id = 0;
            courtCase.CreatedAt =
                DateTime.UtcNow;

            courtCase.UpdatedAt =
                DateTime.UtcNow;

            _context
                .LegalIntelligenceCourtCases
                .Add(courtCase);
        }
        else
        {
            existing.ExternalId =
                courtCase.ExternalId;

            existing.Title =
                courtCase.Title;

            existing.DecisionType =
                courtCase.DecisionType;

            existing.Court =
                courtCase.Court;

            existing.DecisionDate =
                courtCase.DecisionDate;

            existing.Judge =
                courtCase.Judge;

            existing.Keywords =
                courtCase.Keywords;

            existing.Legislation =
                courtCase.Legislation;

            existing.PageUrl =
                courtCase.PageUrl;

            existing.SourceUrl =
                courtCase.SourceUrl;

            existing.SourceName =
                courtCase.SourceName;

            existing.SourceDomain =
                courtCase.SourceDomain;

            existing.SourceTrustLevel =
                courtCase.SourceTrustLevel;

            existing.RawText =
                courtCase.RawText;

            existing.Summary =
                courtCase.Summary;

            existing.Metadata =
                courtCase.Metadata;

            existing.IsVerified =
                courtCase.IsVerified;

            existing.IsPublished =
                courtCase.IsPublished;

            existing.UpdatedAt =
                DateTime.UtcNow;

            courtCase = existing;
        }

        await _context.SaveChangesAsync();

        return Ok(courtCase);
    }


    // ============================================================
    // INGESTION RUNS
    // ============================================================

    [HttpGet("ingestion-runs")]
    public async Task<
        ActionResult<IEnumerable<LegalIntelligenceIngestionRun>>>
        GetIngestionRuns()
    {
        var runs = await _context
            .LegalIntelligenceIngestionRuns
            .AsNoTracking()
            .OrderByDescending(
                x => x.StartedAt)
            .Take(100)
            .ToListAsync();

        return Ok(runs);
    }


    [HttpPost("ingestion-runs")]
    public async Task<
        ActionResult<LegalIntelligenceIngestionRun>>
        CreateIngestionRun(
            LegalIntelligenceIngestionRun run)
    {
        var authResult = ValidateAiServiceRequest();

        if (authResult != null)
        {
            return authResult;
        }

        run.Id = 0;

        if (run.StartedAt == default)
        {
            run.StartedAt =
                DateTime.UtcNow;
        }

        if (
            run.Status.Equals(
                "COMPLETED",
                StringComparison.OrdinalIgnoreCase)
            ||
            run.Status.Equals(
                "PARTIAL",
                StringComparison.OrdinalIgnoreCase)
            ||
            run.Status.Equals(
                "FAILED",
                StringComparison.OrdinalIgnoreCase)
        )
        {
            run.CompletedAt ??=
                DateTime.UtcNow;
        }

        _context
            .LegalIntelligenceIngestionRuns
            .Add(run);

        await _context.SaveChangesAsync();

        return Ok(run);
    }
}