namespace TodoApi.DTOs;

// Response DTO (What we send back to the client)
public record TodoDto(int Id, string Title, bool IsCompleted, DateTime CreatedAt);

// POST request body
public record CreateTodoDto(string Title);

// PUT request body (Full update - replaces everything)
public record UpdateTodoDto(string Title, bool IsCompleted);

// PATCH request body (Partial update - only updates what is provided)
public record PatchTodoDto(string? Title, bool? IsCompleted);
