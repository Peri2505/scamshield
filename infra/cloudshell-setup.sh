#!/usr/bin/env bash
# ScamShield: one-step AWS setup. Run it in AWS CloudShell (the >_ icon in the AWS console),
# which already has the AWS CLI and is signed in. No local install needed.
#
#   bash cloudshell-setup.sh family.member@example.com
#
# Creates (all Free-Tier friendly, safe to re-run):
#   1. DynamoDB table  scamshield-incidents   (on-demand, 180-day TTL)  → incident memory
#   2. SNS topic       scamshield-family-alerts + email subscription     → family alerts
#   3. IAM user        scamshield-local with a LEAST-PRIVILEGE policy:
#        bedrock:InvokeModel on Amazon Nova Lite only, dynamodb Put/Query on this table only,
#        sns:Publish on this topic only. Your main account credentials are never used locally.
#   4. Checks that Amazon Bedrock answers, then prints the lines for your local .env file.
set -euo pipefail

EMAIL="${1:?Usage: bash cloudshell-setup.sh family-member-email@example.com}"
REGION="${AWS_REGION:-us-east-1}"
TABLE="scamshield-incidents"
TOPIC="scamshield-family-alerts"
IAM_USER="scamshield-local"
MODEL_ID="us.amazon.nova-lite-v1:0"

ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
echo "→ Account $ACCOUNT, region $REGION"

# 1 · DynamoDB
if aws dynamodb describe-table --table-name "$TABLE" --region "$REGION" >/dev/null 2>&1; then
  echo "✓ DynamoDB table $TABLE already exists"
else
  echo "→ Creating DynamoDB table $TABLE"
  aws dynamodb create-table --region "$REGION" --table-name "$TABLE" \
    --attribute-definitions AttributeName=householdId,AttributeType=S AttributeName=ts,AttributeType=S \
    --key-schema AttributeName=householdId,KeyType=HASH AttributeName=ts,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST >/dev/null
  aws dynamodb wait table-exists --table-name "$TABLE" --region "$REGION"
  aws dynamodb update-time-to-live --region "$REGION" --table-name "$TABLE" \
    --time-to-live-specification "Enabled=true, AttributeName=expiresAt" >/dev/null
  echo "✓ Table ready (records expire after 180 days)"
fi
TABLE_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/${TABLE}"

# 2 · SNS
TOPIC_ARN=$(aws sns create-topic --name "$TOPIC" --region "$REGION" --query TopicArn --output text)
if aws sns list-subscriptions-by-topic --topic-arn "$TOPIC_ARN" --region "$REGION" \
     --query "Subscriptions[?Endpoint=='$EMAIL'] | length(@)" --output text | grep -q '^0$'; then
  aws sns subscribe --region "$REGION" --topic-arn "$TOPIC_ARN" --protocol email --notification-endpoint "$EMAIL" >/dev/null
  echo "✓ Subscribed $EMAIL. Open that inbox and click 'Confirm subscription'."
else
  echo "✓ $EMAIL is already subscribed"
fi

# 3 · Least-privilege IAM user
aws iam get-user --user-name "$IAM_USER" >/dev/null 2>&1 || {
  aws iam create-user --user-name "$IAM_USER" >/dev/null
  echo "✓ Created IAM user $IAM_USER"
}
POLICY=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "BedrockNovaLiteOnly", "Effect": "Allow", "Action": "bedrock:InvokeModel",
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0",
        "arn:aws:bedrock:*:${ACCOUNT}:inference-profile/${MODEL_ID}"
      ] },
    { "Sid": "IncidentTableOnly", "Effect": "Allow", "Action": ["dynamodb:PutItem", "dynamodb:Query"],
      "Resource": "${TABLE_ARN}" },
    { "Sid": "FamilyTopicOnly", "Effect": "Allow", "Action": "sns:Publish", "Resource": "${TOPIC_ARN}" }
  ]
}
JSON
)
aws iam put-user-policy --user-name "$IAM_USER" --policy-name scamshield-least-privilege --policy-document "$POLICY"
echo "✓ Attached least-privilege policy"

KEY_COUNT=$(aws iam list-access-keys --user-name "$IAM_USER" --query 'length(AccessKeyMetadata)' --output text)
if [ "$KEY_COUNT" -ge 2 ]; then
  echo "✗ $IAM_USER already has 2 access keys. Delete an old one in IAM → Users → $IAM_USER → Security credentials, then re-run."
  exit 1
fi
read -r KEY_ID KEY_SECRET < <(aws iam create-access-key --user-name "$IAM_USER" \
  --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text)

# 4 · Smoke test Bedrock (with your CloudShell identity)
echo "→ Asking Amazon Bedrock (Nova Lite) a test question…"
if REPLY=$(aws bedrock-runtime converse --region "$REGION" --model-id "$MODEL_ID" \
     --messages '[{"role":"user","content":[{"text":"Reply with exactly: ScamShield is ready"}]}]' \
     --inference-config '{"maxTokens":20,"temperature":0}' \
     --query 'output.message.content[0].text' --output text 2>&1); then
  echo "✓ Bedrock says: $REPLY"
else
  echo "⚠ Bedrock test failed: $REPLY"
  echo "  ScamShield still works (it falls back to the scam playbook). Check Bedrock in the console."
fi

cat <<EOF

════════════════════════════════════════════════════════════════════
 Copy EVERYTHING between the lines into the .env file on your Mac.
 Keep it private: never paste it into a chat, email or GitHub.
────────────────────────────────────────────────────────────────────
SCAMSHIELD_AWS=1
AWS_REGION=$REGION
BEDROCK_MODEL_ID=$MODEL_ID
INCIDENTS_TABLE=$TABLE
ALERT_TOPIC_ARN=$TOPIC_ARN
AWS_ACCESS_KEY_ID=$KEY_ID
AWS_SECRET_ACCESS_KEY=$KEY_SECRET
────────────────────────────────────────────────────────────────────
EOF
