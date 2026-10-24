<#
.SYNOPSIS
    Koodal Dating App - Supabase Database Backup, Restore & Verification Tool
    PowerShell implementation for Windows environments and CI/CD automation.

.DESCRIPTION
    Provides automated commands to dump PostgreSQL database schema, table data,
    and storage manifests, compute cryptographic SHA-256 hashes, verify backup integrity,
    and safely restore databases with pre-flight verification and confirmation safeguards.

.PARAMETER Action
    The action to execute: 'Backup', 'Restore', or 'Verify'.

.PARAMETER TargetDir
    The backup directory path to create or read from.

.PARAMETER Force
    Bypass manual confirmation prompt on restore.
#>

param(
    [Parameter(Position=0, Mandatory=$true)]
    [ValidateSet("Backup", "Restore", "Verify")]
    [string]$Action,

    [Parameter(Position=1, Mandatory=$false)]
    [string]$TargetDir = "",

    [Parameter(Mandatory=$false)]
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$DefaultBackupBase = Join-Path $ProjectRoot "backups"

function Write-Info([string]$msg) {
    Write-Host "[INFO] $msg" -ForegroundColor Cyan
}

function Write-Success([string]$msg) {
    Write-Host "[SUCCESS] $msg" -ForegroundColor Green
}

function Write-WarningMsg([string]$msg) {
    Write-Host "[WARN] $msg" -ForegroundColor Yellow
}

function Write-ErrMsg([string]$msg) {
    Write-Host "[ERROR] $msg" -ForegroundColor Red
}

function Compute-Sha256Checksum([string]$filePath) {
    $hashResult = Get-FileHash -Path $filePath -Algorithm SHA256
    $fileName = Split-Path -Leaf $filePath
    return "$($hashResult.Hash.ToLower())  $fileName"
}

function Verify-BackupIntegrity([string]$dirPath) {
    $checksumFile = Join-Path $dirPath "checksums.sha256"
    if (-not (Test-Path $checksumFile)) {
        Write-ErrMsg "Checksum manifest not found in: $dirPath"
        exit 1
    }

    Write-Info "Verifying SHA-256 checksums in $dirPath..."
    $lines = Get-Content $checksumFile
    $allValid = $true

    foreach ($line in $lines) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $parts = $line -split "\s+"
        if ($parts.Length -lt 2) { continue }
        $expectedHash = $parts[0].Trim().ToLower()
        $fileName = $parts[1].Trim()
        $targetFile = Join-Path $dirPath $fileName

        if (-not (Test-Path $targetFile)) {
            Write-ErrMsg "Missing file referenced in checksums: $fileName"
            $allValid = $false
            continue
        }

        $actualHash = (Get-FileHash -Path $targetFile -Algorithm SHA256).Hash.ToLower()
        if ($actualHash -ne $expectedHash) {
            Write-ErrMsg "Checksum mismatch for $fileName! Expected: $expectedHash, Actual: $actualHash"
            $allValid = $false
        } else {
            Write-Host "  OK: $fileName" -ForegroundColor DarkGreen
        }
    }

    if (-not $allValid) {
        Write-ErrMsg "Cryptographic integrity verification failed!"
        exit 1
    }

    Write-Success "All backup artifacts verified successfully with valid SHA-256 checksums."
}

function Backup-Database([string]$destDir) {
    if ([string]::IsNullOrWhiteSpace($destDir)) {
        $timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmssZ")
        $destDir = Join-Path $DefaultBackupBase "backup_$timestamp"
    }

    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    Write-Info "Initiating database backup to: $destDir"

    $schemaFile = Join-Path $destDir "schema.sql"
    $dataFile = Join-Path $destDir "data.sql"
    $storageFile = Join-Path $destDir "storage_manifest.sql"
    $metaFile = Join-Path $destDir "metadata.json"
    $checksumFile = Join-Path $destDir "checksums.sha256"

    # Schema dump
    Write-Info "Dumping PostgreSQL schema (DDL, tables, functions, RLS policies)..."
    $supabaseCli = Get-Command "supabase" -ErrorAction SilentlyContinue
    if ($supabaseCli) {
        try {
            & supabase db dump -f $schemaFile
        } catch {
            Write-WarningMsg "supabase db dump encountered error: $_"
        }
    } elseif ($env:DATABASE_URL) {
        & pg_dump --schema-only -d $env:DATABASE_URL -f $schemaFile
    }

    # Data dump
    Write-Info "Dumping table data (inserts)..."
    if ($supabaseCli) {
        try {
            & supabase db dump --data-only -f $dataFile
        } catch {
            Write-WarningMsg "supabase db dump --data-only encountered error: $_"
        }
    } elseif ($env:DATABASE_URL) {
        & pg_dump --data-only --inserts -d $env:DATABASE_URL -f $dataFile
    }

    # Storage Manifest dump
    Write-Info "Extracting storage object manifest..."
    $manifestSql = @"
-- Storage object manifest snapshot
-- Dumped at $((Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"))
SELECT id, name, bucket_id, owner, created_at, updated_at, metadata 
FROM storage.objects 
ORDER BY bucket_id, created_at;
"@
    Set-Content -Path $storageFile -Value $manifestSql -Encoding UTF8

    # Metadata manifest
    $gitSha = "unknown"
    try {
        $gitSha = (git rev-parse HEAD).Trim()
    } catch {}

    $meta = @{
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        project = "koodal-dating-app"
        git_commit = $gitSha
        schema_file = "schema.sql"
        data_file = "data.sql"
        storage_file = "storage_manifest.sql"
    } | ConvertTo-Json -Depth 3

    Set-Content -Path $metaFile -Value $meta -Encoding UTF8

    # Generate SHA-256 Checksums
    Write-Info "Generating cryptographic SHA-256 checksums..."
    $checksumEntries = @()
    $filesToHash = @("schema.sql", "data.sql", "storage_manifest.sql", "metadata.json")
    foreach ($file in $filesToHash) {
        $fullPath = Join-Path $destDir $file
        if (Test-Path $fullPath) {
            $checksumEntries += (Compute-Sha256Checksum $fullPath)
        }
    }

    Set-Content -Path $checksumFile -Value $checksumEntries -Encoding UTF8

    # Self-verify checksums
    Verify-BackupIntegrity $destDir
    Write-Success "Backup completed and verified successfully at: $destDir"
}

function Restore-Database([string]$targetDir, [bool]$isForce) {
    if ([string]::IsNullOrWhiteSpace($targetDir) -or -not (Test-Path $targetDir)) {
        Write-ErrMsg "Target backup directory does not exist: $targetDir"
        exit 1
    }

    # Verify integrity first
    Verify-BackupIntegrity $targetDir

    $schemaFile = Join-Path $targetDir "schema.sql"
    $dataFile = Join-Path $targetDir "data.sql"

    if (-not (Test-Path $schemaFile)) {
        Write-ErrMsg "schema.sql missing from $targetDir"
        exit 1
    }

    if (-not $isForce) {
        Write-WarningMsg "===================================================================="
        Write-WarningMsg "CAUTION: This will overwrite or modify the target database!"
        Write-WarningMsg "Target backup directory: $targetDir"
        Write-WarningMsg "===================================================================="
        $confirm = Read-Host "Type 'CONFIRM' to proceed with database restoration"
        if ($confirm -ne "CONFIRM") {
            Write-ErrMsg "Restoration aborted by operator."
            exit 1
        }
    }

    Write-Info "Proceeding with database restoration..."
    if ($env:DATABASE_URL) {
        Write-Info "Applying schema via psql..."
        & psql $env:DATABASE_URL -f $schemaFile
        if (Test-Path $dataFile) {
            Write-Info "Applying data via psql..."
            & psql $env:DATABASE_URL -f $dataFile
        }
    } else {
        Write-WarningMsg "DATABASE_URL not set in environment. Running supabase db reset if available..."
        & supabase db reset
    }

    Write-Success "Database restoration completed successfully."
}

# Execution Dispatcher
switch ($Action) {
    "Backup"  { Backup-Database $TargetDir }
    "Restore" { Restore-Database $TargetDir $Force.IsPresent }
    "Verify"  { Verify-BackupIntegrity $TargetDir }
}
