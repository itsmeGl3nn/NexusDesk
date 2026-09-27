# Floci currently does not materialize AWS::Cognito::UserPoolGroup from SAM.
# Run after deployment; preserve existing groups on subsequent runs.
param([string] $StackName = 'contact-center-dev', [string] $Region = 'us-east-1')
$ErrorActionPreference = 'Stop'
$pool = aws --endpoint-url http://localhost:4566 --region $Region cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolId'].OutputValue | [0]" --output text
if ($LASTEXITCODE -ne 0 -or -not $pool -or $pool -eq 'None') { throw 'Cognito pool output not found' }
$groupsJson = aws --endpoint-url http://localhost:4566 --region $Region cognito-idp list-groups --user-pool-id $pool --output json
if ($LASTEXITCODE -ne 0) { throw 'Listing Cognito groups failed' }
$existing = @((($groupsJson | ConvertFrom-Json).Groups) | ForEach-Object { $_.GroupName })
$precedence = 0
foreach ($group in @('admin', 'supervisor', 'agent')) {
    $precedence++
    if ($group -notin $existing) {
        aws --endpoint-url http://localhost:4566 --region $Region cognito-idp create-group --user-pool-id $pool --group-name $group --precedence $precedence --output json | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Creating Cognito group failed: $group" }
    }
}
Write-Host 'Cognito groups ready'
