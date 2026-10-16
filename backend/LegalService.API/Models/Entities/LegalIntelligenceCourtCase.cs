using System.ComponentModel.DataAnnotations;

namespace LegalService.API.Models.Entities;

public class LegalIntelligenceCourtCase
{
    public long Id { get; set; }

    [MaxLength(255)]
    public string? ExternalId { get; set; }

    [Required]
    [MaxLength(255)]
    public string CaseNumber { get; set; } = string.Empty;

    [Required]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string DecisionType { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string Court { get; set; } = string.Empty;

    public DateTime? DecisionDate { get; set; }

    public string? Judge { get; set; }

    public string? Keywords { get; set; }

    public string? Legislation { get; set; }

    public string? PageUrl { get; set; }

    public string? SourceUrl { get; set; }

    [Required]
    [MaxLength(255)]
    public string SourceName { get; set; } =
        "Court of Appeal of Sri Lanka";

    [MaxLength(255)]
    public string? SourceDomain { get; set; }

    [Required]
    [MaxLength(50)]
    public string SourceTrustLevel { get; set; } = "OFFICIAL";

    public string? RawText { get; set; }

    public string? Summary { get; set; }

    public string Metadata { get; set; } = "{}";

    public bool IsVerified { get; set; }

    public bool IsPublished { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}