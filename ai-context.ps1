<#!
Emits a concise context bundle for AI tasks.
Optional -EndpointPattern narrows OpenAPI excerpt.
Requires: Node/npm for schema script if used.
#>
[CmdletBinding()]
param(
    [string]$EndpointPattern = ""
)

function Write-Section {
    param([string]$Title)
    Write-Host "`n=== $Title ===" -ForegroundColor Cyan
}

Write-Section "AI_CONTEXT.md (recent)"
if (Test-Path ./AI_CONTEXT.md) {
    Get-Content ./AI_CONTEXT.md | Select-Object -First 120
} else {
    Write-Host "AI_CONTEXT.md not found" -ForegroundColor Yellow
}

Write-Section "OpenAPI excerpt"
if (Test-Path ./openapi-spec.yaml) {
    if ($EndpointPattern) {
        Select-String -Path ./openapi-spec.yaml -Pattern $EndpointPattern -Context 3,3
    } else {
        Get-Content ./openapi-spec.yaml | Select-Object -First 200
    }
} else {
    Write-Host "openapi-spec.yaml not found" -ForegroundColor Yellow
}

Write-Section "Schema summary (backend/check-schema.ts)"
if (Test-Path ./backend/check-schema.ts) {
    try {
        node ./backend/check-schema.ts
    } catch {
        Write-Host "check-schema.ts failed: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "backend/check-schema.ts not found" -ForegroundColor Yellow
}

Write-Section "Domain notes"
foreach ($path in @("./PRD.md", "./SECURITY.md", "./FRONTEND_API_EXPECTATIONS.md", "./README_GAP_FIXES.md")) {
    if (Test-Path $path) {
        Write-Host "-- $path" -ForegroundColor DarkCyan
    }
}
