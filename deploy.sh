#!/usr/bin/env bash

set -euo pipefail

echo "=============================="
echo " front-platform-vue3 deploy"
echo "=============================="

# Resolve the current script directory dynamically so the project can be renamed
# without needing to update the deployment path again.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_DIR="${LOCAL_DIR:-$SCRIPT_DIR/dist}"

REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_HOST="${REMOTE_HOST:-139.196.158.225}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/front}"
SSH_PORT="${SSH_PORT:-22}"

EXCLUDE_FILE="$SCRIPT_DIR/rsync-exclude.txt"

if [[ ! -d "$LOCAL_DIR" ]]; then
  echo "dist directory not found: $LOCAL_DIR"
  echo "Run the build first, for example: npm run build"
  exit 1
fi

echo "Local dir : $LOCAL_DIR"
echo "Remote    : $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"
echo "SSH port  : $SSH_PORT"
echo ""

RSYNC_ARGS=(
  -avz
  --progress
  --delete
  -e
  "ssh -p $SSH_PORT"
)

if [[ -f "$EXCLUDE_FILE" ]]; then
  RSYNC_ARGS+=(--exclude-from="$EXCLUDE_FILE")
fi

rsync "${RSYNC_ARGS[@]}" \
  "$LOCAL_DIR/" \
  "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

echo ""
echo "=============================="
echo " deploy completed"
echo "=============================="
