using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.DTOs;
using TodoApi.Models;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/[controller]")] // Route translates to: /api/todos
public class TodosController : ControllerBase
{
    private readonly AppDbContext _context;

    // Dependency Injection: ASP.NET Core automatically injects AppDbContext
    public TodosController(AppDbContext context)
    {
        _context = context;
    }

    // 1. GET: /api/todos?isCompleted=true
    // (Read all, with optional query filter)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TodoDto>>> GetTodos([FromQuery] bool? isCompleted)
    {
        var query = _context.Todos.AsQueryable();

        if (isCompleted.HasValue)
        {
            query = query.Where(t => t.IsCompleted == isCompleted.Value);
        }

        var todos = await query
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new TodoDto(t.Id, t.Title, t.IsCompleted, t.CreatedAt))
            .ToListAsync();

        return Ok(todos); // Returns 200 OK
    }

    // 2. GET: /api/todos/5
    // (Read single item by ID)
    [HttpGet("{id}")]
    public async Task<ActionResult<TodoDto>> GetTodo(int id)
    {
        var todo = await _context.Todos.FindAsync(id);

        if (todo == null)
        {
            return NotFound(); // Returns 404 Not Found
        }

        return Ok(new TodoDto(todo.Id, todo.Title, todo.IsCompleted, todo.CreatedAt));
    }

    // 3. POST: /api/todos
    // (Create new resource)
    [HttpPost]
    public async Task<ActionResult<TodoDto>> CreateTodo([FromBody] CreateTodoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            return BadRequest(new { message = "Title is required." }); // Returns 400 Bad Request
        }

        var todo = new Todo
        {
            Title = dto.Title.Trim(),
            IsCompleted = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Todos.Add(todo);
        await _context.SaveChangesAsync();

        var responseDto = new TodoDto(todo.Id, todo.Title, todo.IsCompleted, todo.CreatedAt);

        // REST best practice: returns 201 Created with a "Location" header pointing to /api/todos/{id}
        return CreatedAtAction(nameof(GetTodo), new { id = todo.Id }, responseDto);
    }

    // 4. PUT: /api/todos/5
    // (Full update: Replaces the resource state completely)
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTodo(int id, [FromBody] UpdateTodoDto dto)
    {
        var todo = await _context.Todos.FindAsync(id);

        if (todo == null)
        {
            return NotFound();
        }

        todo.Title = dto.Title.Trim();
        todo.IsCompleted = dto.IsCompleted;

        await _context.SaveChangesAsync();

        return NoContent(); // Standard REST response for PUT is 204 No Content
    }

    // 5. PATCH: /api/todos/5
    // (Partial update: Only updates the fields that were sent)
    [HttpPatch("{id}")]
    public async Task<ActionResult<TodoDto>> PatchTodo(int id, [FromBody] PatchTodoDto dto)
    {
        var todo = await _context.Todos.FindAsync(id);

        if (todo == null)
        {
            return NotFound();
        }

        // Only update fields that were actually provided in the request
        if (dto.Title != null)
        {
            todo.Title = dto.Title.Trim();
        }

        if (dto.IsCompleted.HasValue)
        {
            todo.IsCompleted = dto.IsCompleted.Value;
        }

        await _context.SaveChangesAsync();

        return Ok(new TodoDto(todo.Id, todo.Title, todo.IsCompleted, todo.CreatedAt));
    }

    // 6. DELETE: /api/todos/5
    // (Delete resource)
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTodo(int id)
    {
        var todo = await _context.Todos.FindAsync(id);

        if (todo == null)
        {
            return NotFound();
        }

        _context.Todos.Remove(todo);
        await _context.SaveChangesAsync();

        return NoContent(); // 204 No Content
    }
}
