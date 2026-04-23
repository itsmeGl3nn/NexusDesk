##############################################################################
# deploy.ps1 — Build Lambda handlers and deploy the full stack to AWS
#
# Usage (PowerShell):
#   .\deploy.ps1                          # first run — opens guided prompts
#   .\deploy.ps1 -SkipGuided             # subsequent runs — uses samconfig.toml
#   .\deploy.ps1 -StackName my-stack     # override stack name
#   .\deploy.ps1 -DryRun                 # build only, skip SAM deploy
##############################################################################
param(
    [string] $StackName  = "contact-center-dev",
    [string] $Region     = "us-east-1",
    [switch] $SkipGuided,
    [switch] $DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Step([string]$msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok([string]$msg)   { Write-Host "    ✓ $msg"  -ForegroundColor Green }
function Fail([string]$msg) { Write-Host "    ✗ $msg"  -ForegroundColor Red; exit 1 }

# ── 1. Install backend dependencies ──────────────────────────────────────────
Step "Installing backend dependencies"
Push-Location backend
npm ci --silent
if ($LASTEXITCODE -ne 0) { Fail "npm ci failed" }
Ok "node_modules ready"

# ── 2. Build Lambda handlers with esbuild ────────────────────────────────────
Step "Building Lambda handlers (esbuild)"
node build.js
if ($LASTEXITCODE -ne 0) { Fail "esbuild failed" }
Pop-Location

if ($DryRun) {
    Ok "DryRun flag set — skipping SAM deploy"
    exit 0
}

# ── 3. SAM deploy ─────────────────────────────────────────────────────────────
Step "Deploying stack '$StackName' to AWS ($Region)"

$samArgs = @(
    "deploy",
    "--template", "infrastructure/template.yaml",
    "--stack-name", $StackName,
    "--region", $Region,
    "--capabilities", "CAPABILITY_IAM", "CAPABILITY_AUTO_EXPAND",
    "--resolve-s3"
)

if (-not $SkipGuided -and -not (Test-Path "samconfig.toml")) {
    Write-Host "    No samconfig.toml found — running guided deploy (answers are saved for next time)" -ForegroundColor Yellow
    $samArgs += "--guided"
}

sam @samArgs
if ($LASTEXITCODE -ne 0) { Fail "SAM deploy failed" }

# ── 4. Print stack outputs ────────────────────────────────────────────────────
Step "Stack outputs"
aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output table

Ok "Done — stack '$StackName' deployed"
