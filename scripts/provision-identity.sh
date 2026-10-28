#!/usr/bin/env bash
# Run as the AWS account owner in CloudShell after reviewing and approving this file.
# Creates only a dedicated Cognito user pool/client/domain; creates no users or IAM keys.
set -euo pipefail
umask 077
region=eu-west-3
origin=https://tastekey.52.47.205.18.sslip.io
name=TasteKeyRelayVerified
existing=$(aws cognito-idp list-user-pools --max-results 60 --region "$region" --query "UserPools[?Name=='$name'].Id | [0]" --output text)
if [ "$existing" != None ] && [ -n "$existing" ]; then
  echo 'A matching pool already exists. Inspect it before creating or changing anything.' >&2
  exit 1
fi
pool=$(aws cognito-idp create-user-pool --pool-name "$name" --region "$region" --user-pool-tier LITE --username-attributes email --username-configuration CaseSensitive=false --auto-verified-attributes email --schema '[{"Name":"email","Required":true,"Mutable":true}]' --policies '{"PasswordPolicy":{"MinimumLength":14,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":true,"TemporaryPasswordValidityDays":1}}' --user-attribute-update-settings '{"AttributesRequireVerificationBeforeUpdate":["email"]}' --account-recovery-setting 'RecoveryMechanisms=[{Name=verified_email,Priority=1}]' --email-configuration EmailSendingAccount=COGNITO_DEFAULT --deletion-protection ACTIVE --user-pool-tags Project=TasteKeyRelay --query UserPool.Id --output text)
aws cognito-idp set-user-pool-mfa-config --user-pool-id "$pool" --mfa-configuration OPTIONAL --software-token-mfa-configuration Enabled=true --region "$region" >/dev/null
client=$(aws cognito-idp create-user-pool-client --user-pool-id "$pool" --client-name TasteKeyRelayWeb --no-generate-secret --supported-identity-providers COGNITO --allowed-o-auth-flows code --allowed-o-auth-scopes openid email --allowed-o-auth-flows-user-pool-client --callback-urls "$origin/api/auth/callback" --logout-urls "$origin/account" --prevent-user-existence-errors ENABLED --enable-token-revocation --access-token-validity 1 --id-token-validity 1 --refresh-token-validity 1 --token-validity-units AccessToken=hours,IdToken=hours,RefreshToken=days --region "$region" --query UserPoolClient.ClientId --output text)
domain="tastekey-relay-$(printf '%s' "${pool##*_}" | tr '[:upper:]' '[:lower:]')"
aws cognito-idp create-user-pool-domain --user-pool-id "$pool" --domain "$domain" --managed-login-version 1 --region "$region" >/dev/null
issuer="https://cognito-idp.$region.amazonaws.com/$pool"
jq -n --arg issuer "$issuer" --arg client "$client" --arg domain "$domain.auth.$region.amazoncognito.com" --arg pool "$pool" '{issuer:$issuer,clientId:$client,domain:$domain,poolId:$pool}' > "$HOME/tastekey-oidc-config.json"
printf 'Dedicated Cognito Lite pool and PKCE client created. No users were created. Non-secret deployment identifiers saved to tastekey-oidc-config.json.\n'
