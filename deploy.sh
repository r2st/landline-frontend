#!/bin/bash
set -euo pipefail

APP_ID="d1wnx5ebf5zf0f"
BRANCH="main"
REGION="us-east-1"
ZIP_FILE="deploy.zip"

cd "$(dirname "$0")"

# Check deploy.zip exists
if [ ! -f "$ZIP_FILE" ]; then
  echo "deploy.zip not found. Building..."
  npm run build
  cd dist && zip -r ../deploy.zip . && cd ..
  echo "Built deploy.zip"
fi

echo "==> Creating deployment..."
DEPLOY_OUTPUT=$(aws amplify create-deployment \
  --app-id "$APP_ID" \
  --branch-name "$BRANCH" \
  --region "$REGION" \
  --output json)

UPLOAD_URL=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['zipUploadUrl'])")
JOB_ID=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['jobId'])")

echo "    jobId: $JOB_ID"
echo "==> Uploading deploy.zip..."
curl -T "$ZIP_FILE" "$UPLOAD_URL" --silent --show-error

echo "==> Starting deployment..."
aws amplify start-deployment \
  --app-id "$APP_ID" \
  --branch-name "$BRANCH" \
  --job-id "$JOB_ID" \
  --region "$REGION" \
  --output json > /dev/null

echo "==> Waiting for deployment to complete..."
while true; do
  STATUS=$(aws amplify get-job \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --job-id "$JOB_ID" \
    --region "$REGION" \
    --output json | python3 -c "import sys,json; print(json.load(sys.stdin)['job']['summary']['status'])")

  echo "    Status: $STATUS"
  if [ "$STATUS" = "SUCCEED" ]; then
    break
  elif [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "CANCELLED" ]; then
    echo "Deployment failed with status: $STATUS"
    exit 1
  fi
  sleep 5
done

echo "==> Verifying..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://main.$APP_ID.amplifyapp.com/")
echo "    HTTP status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "Deployment successful! https://main.$APP_ID.amplifyapp.com/"
else
  echo "Warning: Site returned HTTP $HTTP_CODE (may still be propagating)"
fi
