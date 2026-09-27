# Resolve the deployed Floci API and start the Vite UI on http://localhost:5173.
param([string] $StackName = 'contact-center-dev', [string] $Region = 'us-east-1')
$ErrorActionPreference = 'Stop'
$names = @('AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_PROFILE', 'AWS_DEFAULT_PROFILE', 'AWS_PAGER', 'BACKEND_API_URL', 'VITE_API_URL')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
Push-Location "$PSScriptRoot/frontend"
try {
    $env:AWS_ACCESS_KEY_ID = 'test'
    $env:AWS_SECRET_ACCESS_KEY = 'test'
    $env:AWS_SESSION_TOKEN = $null
    $env:AWS_PROFILE = $null
    $env:AWS_DEFAULT_PROFILE = $null
    $env:AWS_PAGER = ''
    $api = aws --endpoint-url http://localhost:4566 --region $Region cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue | [0]" --output text
    if ($LASTEXITCODE -ne 0 -or -not $api -or $api -eq 'None') { throw 'Deploy the backend first: .\deploy.ps1 -Local' }
    $env:BACKEND_API_URL = $api.Trim()
    $env:VITE_API_URL = '/api'
    if (-not (Test-Path node_modules)) {
        npm ci
        if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed' }
    }
    npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
    if ($LASTEXITCODE -ne 0) { throw 'UI server failed' }
} finally {
    foreach ($name in $names) { if ($null -eq $previous[$name]) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue } else { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') } }
    Pop-Location
}

