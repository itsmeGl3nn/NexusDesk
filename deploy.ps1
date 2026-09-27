# Build and deploy the backend. Use -Local for Floci, -DryRun to build only.
param(
    [string] $StackName = "contact-center-dev",
    [string] $Region = "us-east-1",
    [switch] $SkipGuided,
    [switch] $DryRun,
    [switch] $Local
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
function Check([string] $message) {
    if ($LASTEXITCODE -ne 0) { throw $message }
}

Push-Location $PSScriptRoot
$previousEnvironment = @{}
try {
    if ($Local) {
        # Keep dummy credentials and endpoint overrides local to this script.
        $localEnvironment = @{
            AWS_ACCESS_KEY_ID = 'test'
            AWS_SECRET_ACCESS_KEY = 'test'
            AWS_SESSION_TOKEN = $null
            AWS_PROFILE = $null
            AWS_DEFAULT_PROFILE = $null
            AWS_DEFAULT_REGION = $Region
            AWS_REGION = $Region
            AWS_ENDPOINT_URL = 'http://localhost:4566'
            AWS_PAGER = ''
            SAM_CLI_TELEMETRY = '0'
        }
        foreach ($name in $localEnvironment.Keys) {
            $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
            if ($null -eq $localEnvironment[$name]) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
            else { [Environment]::SetEnvironmentVariable($name, $localEnvironment[$name], 'Process') }
        }
    }

    if ($Local -and -not (Get-Command python -ErrorAction SilentlyContinue)) {
        $pythonExe = py -3 -c "import sys; print(sys.executable)"
        Check 'Python is required by samlocal. Install Python and add it to PATH.'
        $previousEnvironment['Path'] = $env:Path
        $env:Path = (Split-Path $pythonExe.Trim()) + [IO.Path]::PathSeparator + $env:Path
    }
    Push-Location backend
    try {
        npm ci --silent
        Check 'npm ci failed'
        npm run build
        Check 'Backend build failed'
    } finally { Pop-Location }
    sam build --template-file infrastructure/template.yaml
    Check 'sam build failed'
    if ($DryRun) { return }

    $deployArgs = @(
        'deploy', '--template-file', '.aws-sam/build/template.yaml',
        '--stack-name', $StackName, '--region', $Region,
        '--capabilities', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND',
        '--resolve-s3', '--no-fail-on-empty-changeset'
    )
    if ($Local) {
        docker compose up -d floci ollama chroma
        Check 'Docker Compose failed. Start Docker Desktop with Linux containers.'
        $ready = $false
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            aws --endpoint-url http://localhost:4566 sts get-caller-identity --cli-connect-timeout 2 --cli-read-timeout 2 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) { $ready = $true; break }
            Start-Sleep -Seconds 2
        }
        if (-not $ready) { throw 'Floci did not become ready. Run docker compose logs floci.' }
        $deployArgs += @('--no-confirm-changeset', '--parameter-overrides', 'AwsEndpoint=http://floci:4566')
        samlocal @deployArgs
        Check 'samlocal deploy to Floci failed'
        & "$PSScriptRoot/docker/init.ps1" -StackName $StackName -Region $Region
        & "$PSScriptRoot/docker/verify.ps1" -StackName $StackName -Region $Region
    } else {
        if (-not $SkipGuided -and -not (Test-Path samconfig.toml)) { $deployArgs += '--guided' }
        sam @deployArgs
        Check 'SAM deployment failed'
        aws cloudformation describe-stacks --stack-name $StackName --region $Region --query 'Stacks[0].Outputs' --output table
        Check 'Reading stack outputs failed'
    }
} finally {
    foreach ($name in $previousEnvironment.Keys) {
        if ($null -eq $previousEnvironment[$name]) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
        else { [Environment]::SetEnvironmentVariable($name, $previousEnvironment[$name], 'Process') }
    }
    Pop-Location
}
