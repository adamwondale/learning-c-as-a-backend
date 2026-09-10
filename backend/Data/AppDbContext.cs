using Microsoft.EntityFrameworkCore;
using TodoApi.Models;

namespace TodoApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // This represents the "Todos" table in PostgreSQL
    public DbSet<Todo> Todos => Set<Todo>();
}
