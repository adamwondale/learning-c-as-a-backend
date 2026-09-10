# ==========================================
# Stage 1: Build & Compile (Full SDK)
# ==========================================
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy .csproj first and restore NuGet packages
# (Docker caches this layer so package restoration is fast on rebuilds!)
COPY ["TodoApi.csproj", "./"]
RUN dotnet restore "./TodoApi.csproj"

# Copy the rest of the backend source code and compile
COPY . .
RUN dotnet publish "TodoApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ==========================================
# Stage 2: Runtime (Lean Image ~100MB)
# ==========================================
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080

# Copy only the compiled binaries from Stage 1
COPY --from=build /app/publish .

# Start the Web API
ENTRYPOINT ["dotnet", "TodoApi.dll"]
