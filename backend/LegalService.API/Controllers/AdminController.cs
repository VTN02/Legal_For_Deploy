using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Security.Claims;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public AdminController(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    /// <summary>
    /// Test admin authorization access.
    /// </summary>
    [HttpGet("test")]
    public IActionResult Test()
    {
        return Ok(new
        {
            message = "Admin access granted",
            userId = User.FindFirstValue(ClaimTypes.NameIdentifier),
            email = User.FindFirstValue(ClaimTypes.Email),
            role = User.FindFirstValue(ClaimTypes.Role)
        });
    }

    /// <summary>
    /// Trigger Sri Lanka Parliament Acts ingestion
    /// through the internal AI service.
    /// </summary>
    [HttpPost("legal-intelligence/sync-parliament-acts")]
    public async Task<IActionResult> SyncParliamentActs()
    {
        var aiServiceBaseUrl = _configuration[
            "AiService:BaseUrl"
        ];

        var ingestionAdminKey = _configuration[
            "AiService:LegalIngestionAdminKey"
        ];

        if (string.IsNullOrWhiteSpace(aiServiceBaseUrl))
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    message = "AI service URL is not configured."
                }
            );
        }

        if (string.IsNullOrWhiteSpace(ingestionAdminKey))
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    message = "Legal ingestion admin key is not configured."
                }
            );
        }

        try
        {
            var client = _httpClientFactory.CreateClient();

            client.BaseAddress = new Uri(
                aiServiceBaseUrl.TrimEnd('/') + "/"
            );

            client.DefaultRequestHeaders.Add(
                "X-Internal-Admin-Key",
                ingestionAdminKey
            );

            var response = await client.PostAsync(
                "api/legal-intelligence/ingest/parliament-acts",
                content: null
            );

            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode(
                    (int)response.StatusCode,
                    new
                    {
                        message = "AI service ingestion failed.",
                        details = responseBody
                    }
                );
            }

            return Content(
                responseBody,
                "application/json"
            );
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new
                {
                    message = "Could not connect to the AI service.",
                    details = ex.Message
                }
            );
        }
        catch (Exception ex)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    message = "Unexpected error while syncing Parliament Acts.",
                    details = ex.Message
                }
            );
        }
    }
}