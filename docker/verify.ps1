# Run after deploying to Floci. Every check must pass.
param([string] $StackName = 'contact-center-dev', [string] $Region = 'us-east-1')
$ErrorActionPreference = 'Stop'
function LocalAws {
    $result = aws --endpoint-url http://localhost:4566 --region $Region @args --output json
    if ($LASTEXITCODE -ne 0) { throw "AWS check failed: $args" }
    return $result | ConvertFrom-Json
}
$stack = LocalAws cloudformation describe-stacks --stack-name $StackName
$outputs = $stack.Stacks[0].Outputs
$api = ($outputs | Where-Object OutputKey -eq ApiEndpoint).OutputValue
$bucket = ($outputs | Where-Object OutputKey -eq AttachmentsBucketName).OutputValue
if (-not $api -or -not $bucket) { throw 'Missing stack outputs' }
foreach ($table in @('Users', 'Tickets', 'Calls', 'Logs', 'Tenants')) {
    $description = LocalAws dynamodb describe-table --table-name $table
    if ($description.Table.TableStatus -ne 'ACTIVE') { throw "Table not active: $table" }
}
LocalAws s3api head-bucket --bucket $bucket | Out-Null
$functions = LocalAws lambda list-functions
if ($functions.Functions.Count -lt 11) { throw 'Expected Lambda functions were not provisioned' }
$response = Invoke-RestMethod "$api/ping" -TimeoutSec 120
if ($response.status -ne 'ok') { throw 'API Gateway / Lambda ping failed' }
Invoke-RestMethod http://localhost:11434/api/tags -TimeoutSec 10 | Out-Null
Invoke-RestMethod http://localhost:8001/api/v2/heartbeat -TimeoutSec 10 | Out-Null
Write-Host "PASS: DynamoDB, S3, Lambda, API Gateway, Ollama, ChromaDB. API: $api"
