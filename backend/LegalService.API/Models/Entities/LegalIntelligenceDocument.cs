using System.ComponentModel.DataAnnotations;

namespace LegalService.API.Models.Entities;

public class LegalIntelligenceDocument
{
    public long Id { get; set; }

    [MaxLength(255)]
    public string? ExternalId { get; set; }

    [Required]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string DocumentType { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ActNumber { get; set; }

    public int? Year { get; set; }

    public DateTime? PublishedDate { get; set; }

    public string? OfficialUrl { get; set; }

    public string? DetailUrl { get; set; }

    [Required]
    [MaxLength(255)]
    public string SourceName { get; set; } = string.Empty;

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