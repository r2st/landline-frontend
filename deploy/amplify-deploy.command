#!/bin/bash
set -euo pipefail

# =============================================================================
# Deploy landline-frontend to AWS Amplify
# Double-click this file in Finder to run in Terminal
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
APP_ID="d1wnx5ebf5zf0f"
BRANCH="main"
ZIP_FILE="$REPO_DIR/deploy.zip"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

cd "$REPO_DIR"

echo "========================================"
echo "  Deploy Landline Frontend to Amplify"
echo "========================================"
echo ""

# Check zip exists
if [ ! -f "$ZIP_FILE" ]; then
    echo "ERROR: deploy.zip not found at $ZIP_FILE"
    echo "Run 'npm run build' first, then: cd dist && zip -r ../deploy.zip . && cd .."
    echo ""
    echo "Press any key to close..."
    read -n1
    exit 1
fi

echo "ZIP file: $ZIP_FILE ($(du -h "$ZIP_FILE" | cut -f1))"
echo ""

# Check AWS CLI
if ! command -v aws &>/dev/null; then
    echo "ERROR: AWS CLI not installed."
    echo "Install: brew install awscli"
    echo ""
    echo "Press any key to close..."
    read -n1
    exit 1
fi

# Step 1: Create deployment
echo "[1/3] Creating deployment..."
DEPLOY_JSON=$(aws amplify create-deployment \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --region "$REGION" \
    --output json)

UPLOAD_URL=$(echo "$DEPLOY_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['zipUploadUrl'])")
JOB_ID=$(echo "$DEPLOY_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['jobId'])")

echo "  Job ID: $JOB_ID"
echo ""

# Step 2: Upload zip
echo "[2/3] Uploading deploy.zip..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -T "$ZIP_FILE" "$UPLOAD_URL")
if [ "$HTTP_CODE" = "200" ]; then
    echo "  Upload successful (HTTP $HTTP_CODE)"
else
    echo "  ERROR: Upload failed (HTTP $HTTP_CODE)"
    echo ""
    echo "Press any key to close..."
    read -n1
    exit 1
fi
echo ""

# Step 3: Start deployment
echo "[3/3] Starting deployment..."
aws amplify start-deployment \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --job-id "$JOB_ID" \
    --region "$REGION" \
    --output json > /dev/null

echo "  Deployment started!"
echo ""

# Wait for completion
echo "Waiting for deployment to finish..."
for i in $(seq 1 60); do
    STATUS=$(aws amplify get-job \
        --app-id "$APP_ID" \
        --branch-name "$BRANCH" \
        --job-id "$JOB_ID" \
        --region "$REGION" \
        --output json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['job']['summary']['status'])" 2>/dev/null || echo "PENDING")

    if [ "$STATUS" = "SUCCEED" ]; then
        echo "  Deployment SUCCEEDED!"
        break
    elif [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "CANCELLED" ]; then
        echo "  Deployment $STATUS"
        echo ""
        echo "Press any key to close..."
        read -n1
        exit 1
    fi
    printf "  Status: %s (waiting %ds)...\r" "$STATUS" "$((i * 5))"
    sleep 5
done
echo ""

# Verify
echo ""
echo "Verifying site..."
SITE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://main.$APP_ID.amplifyapp.com/")
echo "  Site HTTP status: $SITE_STATUS"
echo ""
echo "========================================"
echo "  https://main.$APP_ID.amplifyapp.com/"
echo "========================================"
echo ""
echo "Press any key to close..."
read -n1
