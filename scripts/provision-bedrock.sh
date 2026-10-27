#!/usr/bin/env bash
# Run only with owner approval in AWS CloudShell. Never print the credential file.
set -euo pipefail
umask 077
user=tastekey-relay-model
account=$(aws sts get-caller-identity --query Account --output text)
until=$(date -u -d '+30 days' +%Y-%m-%dT%H:%M:%SZ)
profile="arn:aws:bedrock:eu-west-3:${account}:inference-profile/eu.amazon.nova-micro-v1:0"
policy=$(mktemp)
trap 'rm -f "$policy"' EXIT
cat > "$policy" <<JSON
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"bedrock:InvokeModel","Resource":["${profile}","arn:aws:bedrock:eu-west-3::foundation-model/amazon.nova-micro-v1:0","arn:aws:bedrock:eu-west-1::foundation-model/amazon.nova-micro-v1:0","arn:aws:bedrock:eu-central-1::foundation-model/amazon.nova-micro-v1:0","arn:aws:bedrock:eu-north-1::foundation-model/amazon.nova-micro-v1:0"],"Condition":{"IpAddress":{"aws:SourceIp":"52.47.205.18/32"},"DateLessThan":{"aws:CurrentTime":"${until}"}}}]}
JSON
# Refuse to modify/reuse an existing identity or overwrite an earlier secret.
test ! -e "$HOME/tastekey-bedrock-private.json"
if aws iam get-user --user-name "$user" >/dev/null 2>&1; then echo 'Dedicated identity already exists; inspect it before changing anything.'; exit 1; fi
aws iam create-user --user-name "$user" --tags Key=Project,Value=TasteKeyRelay >/dev/null
aws iam put-user-policy --user-name "$user" --policy-name TasteKeyNovaMicroOnly --policy-document "file://${policy}"
aws iam create-access-key --user-name "$user" --output json > "$HOME/tastekey-bedrock-private.json"
chmod 600 "$HOME/tastekey-bedrock-private.json"
printf 'Dedicated Nova Micro-only identity created. Invocation is restricted to the TasteKey static IP until %s.\n' "$until"
printf 'Download the private file %s/tastekey-bedrock-private.json. Do not paste its contents into chat.\n' "$HOME"
