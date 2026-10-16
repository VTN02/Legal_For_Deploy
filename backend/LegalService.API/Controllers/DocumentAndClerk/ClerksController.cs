using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LegalService.API.DTOs.Requests;
using LegalService.API.Interfaces;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/clerks")]
public class ClerksController : ControllerBase
{
    private readonly IClerkService _clerkService;

    public ClerksController(IClerkService clerkService)
    {
        _clerkService = clerkService;
    }

    /// <summary>
    /// Get all registered clerks.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var clerks = await _clerkService.GetAllClerksAsync();
        return Ok(clerks);
    }

    /// <summary>
    /// Get clerk details by clerk ID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var clerk = await _clerkService.GetClerkByIdAsync(id);
        if (clerk == null)
            return NotFound(new { message = $"Clerk with ID '{id}' was not found." });

        return Ok(clerk);
    }

    /// <summary>
    /// Get clerk details by linked user ID.
    /// </summary>
    [HttpGet("by-user/{userId:int}")]
    public async Task<IActionResult> GetByUserId(int userId)
    {
        var clerk = await _clerkService.GetClerkByUserIdAsync(userId);
        if (clerk == null)
            return NotFound(new { message = $"Clerk for User ID '{userId}' was not found." });

        return Ok(clerk);
    }

    /// <summary>
    /// Register an existing user as a clerk.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateClerkRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var created = await _clerkService.CreateClerkAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.ClerkId }, created);
    }

    /// <summary>
    /// Update clerk details (name, email, password, contact, department, status).
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateClerkRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var updated = await _clerkService.UpdateClerkAsync(id, request);
            if (updated == null)
                return NotFound(new { message = $"Clerk with ID '{id}' was not found." });

            return Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Delete a clerk permanently.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var success = await _clerkService.DeleteClerkAsync(id);
        if (!success)
            return NotFound(new { message = $"Clerk with ID '{id}' was not found." });

        return Ok(new { message = "Clerk deleted successfully." });
    }

    /// <summary>
    /// Toggle active status of a clerk.
    /// </summary>
    [HttpPost("{id:int}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var success = await _clerkService.ToggleClerkStatusAsync(id);
        if (!success)
            return NotFound(new { message = $"Clerk with ID '{id}' was not found." });

        return Ok(new { message = "Clerk status updated successfully." });
    }


    /// <summary>
    /// Get all documentation requests assigned to a clerk.
    /// </summary>
    [HttpGet("{id:int}/requests")]
    public async Task<IActionResult> GetAssignedRequests(int id)
    {
        var requests = await _clerkService.GetAssignedRequestsAsync(id);
        return Ok(requests);
    }
}
