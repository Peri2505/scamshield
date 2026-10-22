#!/usr/bin/env bash
# One-time AWS setup for ScamShield. Uses only Free-Tier-friendly resources.
#   - DynamoDB table (on-demand) with a 180-day TTL for incident memory
#   - SNS topic with an EMAIL subscription for family alerts (no SMS registration needed)
#
# Usage:  ./infra/setup-aws.sh family.member@example.com
# Then:   copy the printed ALERT_TOPIC_ARN into your .env, and click
#         "Confirm subscription" in the email AWS sends to that address.
set -euo pipefail

EMAIL="${1:?Usage: $0 family-member-email@example.com}"
REGION="${AWS_REGION:-us-east-1}"
TABLE="${INCIDENTS_TABLE:-scamshield-incidents}"
TOPIC="${ALERT_TOPIC_NAME:-scamshield-family-alerts}"

echo "→ Region: $REGION"

if aws dynamodb describe-table --table-name "$TABLE" --region "$REGION" >/dev/null 2>&1; then
  echo "✓ DynamoDB table $TABLE already exists"
else
  echo "→ Creating DynamoDB table $TABLE (on-demand billing)"
  aws dynamodb create-table --region "$REGION" \
    --table-name "$TABLE" \
    --attribute-definitions AttributeName=householdId,AttributeType=S AttributeName=ts,AttributeType=S \
    --key-schema AttributeName=householdId,KeyType=HASH AttributeName=ts,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST >/dev/null
  aws dynamodb wait table-exists --table-name "$TABLE" --region "$REGION"
  aws dynamodb update-time-to-live --region "$REGION" --table-name "$TABLE" \
    --time-to-live-specification "Enabled=true, AttributeName=expiresAt" >/dev/null
  echo "✓ Table ready (TTL on expiresAt)"
fi

echo "→ Creating SNS topic $TOPIC"
TOPIC_ARN=$(aws sns create-topic --name "$TOPIC" --region "$REGION" --query TopicArn --output text)
aws sns subscribe --region "$REGION" --topic-arn "$TOPIC_ARN" --protocol email --notification-endpoint "$EMAIL" >/dev/null
echo "✓ Subscribed $EMAIL — check that inbox and click 'Confirm subscription'."

cat <<EOF

Add these to your .env:

SCAMSHIELD_AWS=1
AWS_REGION=$REGION
INCIDENTS_TABLE=$TABLE
ALERT_TOPIC_ARN=$TOPIC_ARN

Bedrock: in the AWS console → Amazon Bedrock → Model access, make sure
Amazon Nova Lite is enabled in $REGION (or set BEDROCK_MODEL_ID to a model you have).
EOF
