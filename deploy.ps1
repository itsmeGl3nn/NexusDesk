##############################################################################
# deploy.ps1 - Build Lambda handlers and deploy to LocalStack or AWS
#
# Usage (PowerShell):
#   .\deploy.ps1 -Local                  # deploy stack into LocalStack (4566)
#   .\deploy.ps1                         # first AWS deploy - opens guided prompts
#   .\deploy.ps1 -SkipGuided             # subsequent AWS deploys (uses samconfig.toml)
#   .\deploy.ps1 -StackName my-stack     # override stack name
#   .\deploy.ps1 -DryRun                 # build only, skip deploy
#
# -Local mode requires:
#   - Docker Desktop running
#   - Python + pip (for samlocal)
#   - AWS SAM CLI
##############################################################################
param(
    [string] $StackName  = "contact-center-dev",
    [string] $Region     = "us-east-1",
    [switch] $SkipGuided,
    [switch] $DryRun,
    [switch] $Local
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Step([string]$msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok([string]$msg)   { Write-Host "    [OK] $msg"  -ForegroundColor Green }
function Fail([string]$msg) { Write-Host "    [FAIL] $msg"  -ForegroundColor Red; exit 1 }

# --- 1. Install backend dependencies ---
Step "Installing backend dependencies"
Push-Location backend
npm ci --silent
if ($LASTEXITCODE -ne 0) { Fail "npm ci failed" }
Ok "node_modules ready"

# --- 2. Build Lambda handlers with esbuild ---
Step "Building Lambda handlers (esbuild)"
node build.js
if ($LASTEXITCODE -ne 0) { Fail "esbuild failed" }
Pop-Location

if ($DryRun) {
    Ok "DryRun flag set - skipping deploy"
    exit 0
}

# --- LOCAL mode: deploy SAM stack into LocalStack via samlocal ---
if ($Local) {
    Step "Starting LocalStack (docker-compose)"
    docker-compose up -d
    if ($LASTEXITCODE -ne 0) { Fail "docker-compose up failed" }

    # Wait for LocalStack to be healthy
    Write-Host "    Waiting for LocalStack..." -ForegroundColor Yellow
    $retries = 0
    do {
        Start-Sleep -Seconds 2
        $status = try { (Invoke-WebRequest -Uri "http://localhost:4566/_localstack/health" -UseBasicParsing -TimeoutSec 2).StatusCode } catch { 0 }
        $retries++
    } while ($status -ne 200 -and $retries -lt 30)

    if ($status -ne 200) { Fail "LocalStack did not become healthy in time" }
    Ok "LocalStack is ready at http://localhost:4566"

    # Verify samlocal is installed (wraps SAM CLI to point at LocalStack)
    $samlocal = Get-Command samlocal -ErrorAction SilentlyContinue
    if (-not $samlocal) {
        Write-Host "    samlocal not found - installing aws-sam-cli-local via pip" -ForegroundColor Yellow
        pip install --quiet aws-sam-cli-local
        if ($LASTEXITCODE -ne 0) { Fail "Failed to install aws-sam-cli-local (need Python + pip)" }
    }

    Step "samlocal build"
    samlocal build --template infrastructure/template.yaml
    if ($LASTEXITCODE -ne 0) { Fail "samlocal build failed" }

    Step "samlocal deploy -> LocalStack (creates Lambda zips + API Gateway)"
    samlocal deploy `
        --stack-name $StackName `
        --resolve-s3 `
        --no-confirm-changeset `
        --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
    if ($LASTEXITCODE -ne 0) { Fail "samlocal deploy failed" }

    Step "Stack outputs"
    aws --endpoint-url=http://localhost:4566 cloudformation describe-stacks `
        --stack-name $StackName `
        --query "Stacks[0].Outputs" `
        --output table

    # Resolve the API Gateway ID and print the usable endpoint
    $apiId = aws --endpoint-url=http://localhost:4566 apigateway get-rest-apis `
        --query "items[?name=='$StackName'].id | [0]" --output text
    if ($apiId -and $apiId -ne "None") {
        Ok "API base URL: http://localhost:4566/restapis/$apiId/Prod/_user_request_"
        Write-Host "    Example:    curl http://localhost:4566/restapis/$apiId/Prod/_user_request_/ping" -ForegroundColor Gray
    }

    Ok "Done - stack '$StackName' deployed to LocalStack"
    exit 0
}

# --- AWS DEPLOY mode ---

$samArgs = @(
    "deploy",
    "--template", "infrastructure/template.yaml",
    "--stack-name", $StackName,
    "--region", $Region,
    "--capabilities", "CAPABILITY_IAM", "CAPABILITY_AUTO_EXPAND",
    "--resolve-s3"
)

if (-not $SkipGuided -and -not (Test-Path "samconfig.toml")) {
    Write-Host "    No samconfig.toml found - running guided deploy (answers are saved for next time)" -ForegroundColor Yellow
    $samArgs += "--guided"
}

sam @samArgs
if ($LASTEXITCODE -ne 0) { Fail "SAM deploy failed" }

# --- 4. Print stack outputs ---
Step "Stack outputs"
aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output table

Ok "Done - stack '$StackName' deployed"
