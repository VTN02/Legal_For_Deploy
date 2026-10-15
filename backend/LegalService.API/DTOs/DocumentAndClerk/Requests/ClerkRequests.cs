using System.ComponentModel.DataAnnotations;

namespace LegalService.API.DTOs.Requests;

public class CreateClerkRequest
{
    public string? Name { get; set; }
    public string? FullName { get; set; }
    public string? UserId { get; set; }

    [Required(ErrorMessage = "Email / Username is required.")]
    [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    [MinLength(6, ErrorMessage = "Password must be at least 6 characters long.")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Contact phone / mobile number is required.")]
    [RegularExpression(@"^(?:\+94\s?|0)(?:7[0-8]|11|21|23|24|25|26|27|31|32|33|34|35|36|37|38|41|45|47|51|52|54|55|57|63|65|66|67)[\s-]?\d{3}[\s-]?\d{4}$|^\+[1-9]\d{0,3}[\s-]?\(?\d{1,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,9}$", ErrorMessage = "Please enter a valid mobile number (e.g. 077 123 4567 or +94 77 123 4567).")]
    public string Contact { get; set; } = string.Empty;

    [Required(ErrorMessage = "Department is required.")]
    public string Department { get; set; } = string.Empty;

    public string GetEffectiveName()
    {
        if (!string.IsNullOrWhiteSpace(Name)) return Name.Trim();
        if (!string.IsNullOrWhiteSpace(FullName)) return FullName.Trim();
        if (!string.IsNullOrWhiteSpace(UserId)) return UserId.Trim();
        return "Clerk";
    }
}

public class UpdateClerkRequest
{
    public string? Name { get; set; }

    [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
    public string? Email { get; set; }

    public string? Password { get; set; }

    [Required]
    public string Contact { get; set; } = string.Empty;

    [Required]
    public string Department { get; set; } = string.Empty;

    public bool? IsActive { get; set; }
}
