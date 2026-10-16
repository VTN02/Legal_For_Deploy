using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LegalService.API.Migrations
{
    /// <inheritdoc />
    public partial class AddLegalIntelligenceStorage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LegalIntelligenceCourtCases",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExternalId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CaseNumber = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    DecisionType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Court = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    DecisionDate = table.Column<DateTime>(type: "date", nullable: true),
                    Judge = table.Column<string>(type: "text", nullable: true),
                    Keywords = table.Column<string>(type: "text", nullable: true),
                    Legislation = table.Column<string>(type: "text", nullable: true),
                    PageUrl = table.Column<string>(type: "text", nullable: true),
                    SourceUrl = table.Column<string>(type: "text", nullable: true),
                    SourceName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false, defaultValue: "Court of Appeal of Sri Lanka"),
                    SourceDomain = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    SourceTrustLevel = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "OFFICIAL"),
                    RawText = table.Column<string>(type: "text", nullable: true),
                    Summary = table.Column<string>(type: "text", nullable: true),
                    Metadata = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "{}"),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LegalIntelligenceCourtCases", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LegalIntelligenceDocuments",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExternalId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Title = table.Column<string>(type: "text", nullable: false),
                    DocumentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ActNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Year = table.Column<int>(type: "integer", nullable: true),
                    PublishedDate = table.Column<DateTime>(type: "date", nullable: true),
                    OfficialUrl = table.Column<string>(type: "text", nullable: true),
                    DetailUrl = table.Column<string>(type: "text", nullable: true),
                    SourceName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    SourceDomain = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    SourceTrustLevel = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "OFFICIAL"),
                    RawText = table.Column<string>(type: "text", nullable: true),
                    Summary = table.Column<string>(type: "text", nullable: true),
                    Metadata = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "{}"),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LegalIntelligenceDocuments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LegalIntelligenceIngestionRuns",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SourceType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SourceName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DiscoveredCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    SavedCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    RejectedCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "RUNNING"),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    Metadata = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "{}")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LegalIntelligenceIngestionRuns", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LegalIntelligenceCourtCases_Court_DecisionType_CaseNumber_D~",
                table: "LegalIntelligenceCourtCases",
                columns: new[] { "Court", "DecisionType", "CaseNumber", "DecisionDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LegalIntelligenceDocuments_ExternalId",
                table: "LegalIntelligenceDocuments",
                column: "ExternalId",
                unique: true,
                filter: "\"ExternalId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_LegalIntelligenceIngestionRuns_SourceType",
                table: "LegalIntelligenceIngestionRuns",
                column: "SourceType");

            migrationBuilder.CreateIndex(
                name: "IX_LegalIntelligenceIngestionRuns_StartedAt",
                table: "LegalIntelligenceIngestionRuns",
                column: "StartedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LegalIntelligenceCourtCases");

            migrationBuilder.DropTable(
                name: "LegalIntelligenceDocuments");

            migrationBuilder.DropTable(
                name: "LegalIntelligenceIngestionRuns");
        }
    }
}
