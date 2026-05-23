#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${STACK_NAME:-react-flutter-emded-showcase}"
ASSET_NAME="${ASSET_NAME:-react-flutter-emded-showcase}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-demo}"
SITE_BUCKET_NAME="${SITE_BUCKET_NAME:-}"
TEMPLATE_FILE="${TEMPLATE_FILE:-infra/aws/static-site.template.yml}"
BUILD_DIR="${BUILD_DIR:-dist}"

command -v aws >/dev/null 2>&1 || { echo "aws CLI is required" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required" >&2; exit 1; }

npm run lint
npm run build

if [[ ! -f "$BUILD_DIR/index.html" ]]; then
  echo "Missing $BUILD_DIR/index.html after build" >&2
  exit 1
fi

parameter_overrides=(
  "AssetName=$ASSET_NAME"
  "EnvironmentName=$ENVIRONMENT_NAME"
)

if [[ -n "$SITE_BUCKET_NAME" ]]; then
  parameter_overrides+=("SiteBucketName=$SITE_BUCKET_NAME")
fi

aws cloudformation validate-template \
  --template-body "file://$TEMPLATE_FILE" \
  --region "$AWS_REGION" \
  >/dev/null

aws cloudformation deploy \
  --template-file "$TEMPLATE_FILE" \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --parameter-overrides "${parameter_overrides[@]}" \
  --tags "Asset=$ASSET_NAME" "Environment=$ENVIRONMENT_NAME"

stack_output() {
  local key="$1"
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$key'].OutputValue | [0]" \
    --output text
}

bucket_name="$(stack_output SiteBucketName)"
distribution_id="$(stack_output CloudFrontDistributionId)"
domain_name="$(stack_output CloudFrontDomainName)"
site_url="$(stack_output SiteUrl)"

aws s3 sync "$BUILD_DIR/" "s3://$bucket_name/" \
  --region "$AWS_REGION" \
  --delete \
  --cache-control "public,max-age=300" \
  --only-show-errors

copy_no_cache() {
  local local_path="$1"
  local content_type="$2"

  if [[ ! -f "$BUILD_DIR/$local_path" ]]; then
    return
  fi

  aws s3 cp "$BUILD_DIR/$local_path" "s3://$bucket_name/$local_path" \
    --region "$AWS_REGION" \
    --cache-control "no-cache" \
    --content-type "$content_type" \
    --only-show-errors
}

copy_no_cache "index.html" "text/html; charset=utf-8"
copy_no_cache "flutter_embed/flutter_bootstrap.js" "text/javascript; charset=utf-8"
copy_no_cache "flutter_embed/flutter.js" "text/javascript; charset=utf-8"
copy_no_cache "flutter_embed/main.dart.js" "text/javascript; charset=utf-8"
copy_no_cache "flutter_embed/flutter_service_worker.js" "text/javascript; charset=utf-8"
copy_no_cache "flutter_embed/manifest.json" "application/manifest+json; charset=utf-8"
copy_no_cache "flutter_embed/version.json" "application/json; charset=utf-8"

invalidation_id="$(aws cloudfront create-invalidation \
  --distribution-id "$distribution_id" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)"

cat <<EOF
AWS static site deployed.
Stack: $STACK_NAME
Bucket: $bucket_name
CloudFront distribution: $distribution_id
Invalidation: $invalidation_id
URL: $site_url
Domain: $domain_name
EOF
