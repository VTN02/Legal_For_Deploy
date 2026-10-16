using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Responses;

namespace LegalService.API.Interfaces;

public interface IClerkService
{
    Task<IEnumerable<ClerkResponse>> GetAllClerksAsync();
    Task<ClerkResponse?> GetClerkByIdAsync(int clerkId);
    Task<ClerkResponse?> GetClerkByUserIdAsync(int userId);
    Task<ClerkResponse> CreateClerkAsync(CreateClerkRequest request);
    Task<ClerkResponse?> UpdateClerkAsync(int clerkId, UpdateClerkRequest request);
    Task<bool> DeactivateClerkAsync(int clerkId);
    Task<bool> ToggleClerkStatusAsync(int clerkId);
    Task<bool> DeleteClerkAsync(int clerkId);
    Task<IEnumerable<DocumentationRequestResponse>> GetAssignedRequestsAsync(int clerkId);
}

