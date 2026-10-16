using System.ComponentModel.DataAnnotations;

namespace LegalService.API.Models.Entities;

public class LegalIntelligenceIngestionRun
{
    public long Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string SourceType { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? SourceName { get; set; }

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    public DateTime? CompletedAt { get; set; }

    public int DiscoveredCount { get; set; }

    public int SavedCount { get; set; }

    public int RejectedCount { get; set; }

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "RUNNING";

    public string? ErrorMessage { get; set; }

    public string Metadata { get; set; } = "{}";
}