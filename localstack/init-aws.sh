#!/bin/bash
# LocalStack initialization script
# Sets up basic AWS resources for development

set -e

ENDPOINT="http://localhost:4566"
REGION="us-east-1"
AWS="aws --endpoint-url=$ENDPOINT --region $REGION"

echo "=== LocalStack Initialization Setup ==="

# Wait for LocalStack to be ready
until $AWS dynamodb list-tables; do
  echo "Waiting for LocalStack..."
  sleep 2
done

echo "✓ LocalStack is ready"

# ============================================================
# DynamoDB Tables
# ============================================================
echo "Creating DynamoDB tables..."

# DynamoDB
# ============================================================
echo "Creating DynamoDB table..."
$AWS dynamodb create-table \
  --table-name Users \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null || echo "Users table already exists"

# Tickets Table
$AWS dynamodb create-table \
  --table-name Tickets \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null || echo "Tickets table already exists"

# Calls Table
$AWS dynamodb create-table \
  --table-name Calls \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null || echo "Calls table already exists"

# Logs Table
$AWS dynamodb create-table \
  --table-name Logs \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null || echo "Logs table already exists"

# Tenants Table
$AWS dynamodb create-table \
  --table-name Tenants \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null || echo "Tenants table already exists"

# ============================================================
# Cognito User Pool
# ============================================================
echo "Creating Cognito User Pool..."
USER_POOL_ID=$($AWS cognito-idp create-user-pool \
  --pool-name ContactCenterUserPool \
  --auto-verified-attributes email \
  --username-attributes email \
  --schema \
    Name=email,Required=true,Mutable=true \
    Name=tenantId,AttributeDataType=String,Mutable=true \
  --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":false}}' \
  --query 'UserPool.Id' --output text 2>/dev/null) || true

if [ -z "$USER_POOL_ID" ] || [ "$USER_POOL_ID" = "None" ]; then
  echo "User Pool may already exist, fetching..."
  USER_POOL_ID=$($AWS cognito-idp list-user-pools --max-results 10 \
    --query "UserPools[?Name=='ContactCenterUserPool'].Id | [0]" --output text)
fi

echo "✓ User Pool ID: $USER_POOL_ID"

# Create App Client
echo "Creating Cognito App Client..."
CLIENT_ID=$($AWS cognito-idp create-user-pool-client \
  --user-pool-id "$USER_POOL_ID" \
  --client-name ContactCenterClient \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_PASSWORD_AUTH \
  --query 'UserPoolClient.ClientId' --output text 2>/dev/null) || true

if [ -z "$CLIENT_ID" ] || [ "$CLIENT_ID" = "None" ]; then
  echo "App Client may already exist, fetching..."
  CLIENT_ID=$($AWS cognito-idp list-user-pool-clients \
    --user-pool-id "$USER_POOL_ID" --max-results 10 \
    --query "UserPoolClients[?ClientName=='ContactCenterClient'].ClientId | [0]" --output text)
fi

echo "✓ Client ID: $CLIENT_ID"

# Create Groups
echo "Creating Cognito groups..."
$AWS cognito-idp create-group --user-pool-id "$USER_POOL_ID" --group-name admin \
  --description "Full access" --precedence 1 2>/dev/null || echo "admin group exists"
$AWS cognito-idp create-group --user-pool-id "$USER_POOL_ID" --group-name supervisor \
  --description "Supervisor access" --precedence 2 2>/dev/null || echo "supervisor group exists"
$AWS cognito-idp create-group --user-pool-id "$USER_POOL_ID" --group-name agent \
  --description "Agent access" --precedence 3 2>/dev/null || echo "agent group exists"

# ============================================================
# Seed Users (Cognito + DynamoDB)
# ============================================================
TENANT_ID=$(uuidgen)
NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

create_seed_user() {
  local email=$1
  local password=$2
  local group=$3
  local display_name=$4

  echo "Creating seed user: $email ($group)..."

  # Create Cognito user
  $AWS cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$email" \
    --temporary-password "$password" \
    --user-attributes \
      Name=email,Value="$email" \
      Name=email_verified,Value=true \
      Name=custom:tenantId,Value="$TENANT_ID" \
    2>/dev/null || echo "  Cognito user $email already exists"

  # Set permanent password (skip challenge)
  $AWS cognito-idp admin-set-user-password \
    --user-pool-id "$USER_POOL_ID" \
    --username "$email" \
    --password "$password" \
    --permanent 2>/dev/null || true

  # Add to group
  $AWS cognito-idp admin-add-user-to-group \
    --user-pool-id "$USER_POOL_ID" \
    --username "$email" \
    --group-name "$group" 2>/dev/null || true

  # Get the user's sub (Cognito UUID)
  local user_sub
  user_sub=$($AWS cognito-idp admin-get-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$email" \
    --query "UserAttributes[?Name=='sub'].Value | [0]" --output text 2>/dev/null) || true

  if [ -n "$user_sub" ] && [ "$user_sub" != "None" ]; then
    echo "  Sub: $user_sub — seeding DynamoDB..."
    $AWS dynamodb put-item \
      --table-name Users \
      --item "{
        \"PK\": {\"S\": \"TENANT#$TENANT_ID\"},
        \"SK\": {\"S\": \"USER#$user_sub\"},
        \"userId\": {\"S\": \"$user_sub\"},
        \"tenantId\": {\"S\": \"$TENANT_ID\"},
        \"email\": {\"S\": \"$email\"},
        \"displayName\": {\"S\": \"$display_name\"},
        \"role\": {\"S\": \"$group\"},
        \"status\": {\"S\": \"active\"},
        \"createdAt\": {\"S\": \"$NOW\"},
        \"updatedAt\": {\"S\": \"$NOW\"}
      }" 2>/dev/null || echo "  DynamoDB record for $email already exists"
  else
    echo "  ⚠ Could not retrieve sub for $email — skipping DynamoDB seed"
  fi
}

create_seed_user "admin@localhost.com"      "Admin123!"      "admin"      "Admin User"
create_seed_user "supervisor@localhost.com"  "Super123!"      "supervisor" "Supervisor User"
create_seed_user "agent@localhost.com"       "Agent123!"      "agent"      "Agent User"

# ============================================================
# Write Cognito IDs to a file so SAM/backend can pick them up
# ============================================================
echo "Writing Cognito IDs to /tmp/cognito-ids.env..."
cat > /tmp/cognito-ids.env <<EOF
COGNITO_USER_POOL_ID=$USER_POOL_ID
COGNITO_CLIENT_ID=$CLIENT_ID
EOF

# ============================================================
# S3
# ============================================================
echo "Creating S3 bucket..."
$AWS s3 mb s3://contact-center-bucket 2>/dev/null || echo "Bucket already exists"

# ============================================================
# SQS
# ============================================================
echo "Creating SQS queue..."
$AWS sqs create-queue --queue-name contact-queue 2>/dev/null || echo "Queue already exists"

# ============================================================
# SNS
# ============================================================
echo "Creating SNS topic..."
$AWS sns create-topic --name contact-topic 2>/dev/null || echo "Topic already exists"

echo ""
echo "============================================"
echo "  LocalStack initialization complete!"
echo "  User Pool ID : $USER_POOL_ID"
echo "  Client ID    : $CLIENT_ID"
echo "--------------------------------------------"
echo "  Seed Users (password / role):"
echo "    admin@localhost.com      / Admin123!  / admin"
echo "    supervisor@localhost.com / Super123!  / supervisor"
echo "    agent@localhost.com      / Agent123!  / agent"
echo "  Tenant: $TENANT_ID"
echo "============================================"
