namespace LegalService.API.DTOs.Agent;

public sealed class ApproveWorkflowRequest
{
    public Guid? LawyerId { get; set; }

    public Guid? SlotId { get; set; }

    public DateOnly? BookingDate { get; set; }

    public string? Comments { get; set; }
}