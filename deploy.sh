#!/usr/bin/env bash
#
# WE4Free deploy — zero-edit version.
# Usage:  ./deploy.sh "YOUR_HOSTINGER_PASSWORD"
#   (password passed as the only argument; nothing else to edit)
#
# The script uploads ./we4free_website/* into the site's public_html.
# It does NOT delete anything already on the server (safe for shared public_html).
#
set -euo pipefail

SFTP_HOST=88.223.85.164
SFTP_PORT=65002
SFTP_USER=u526066719.deliberateensemble.works
SFTP_PATH=/home/u526066719/domains/deliberateensemble.works/public_html

if [ -z "${1:-}" ]; then
  echo "ERROR: password missing." >&2
  echo "Run:  ./deploy.sh \"YOUR_HOSTINGER_PASSWORD\"" >&2
  exit 1
fi
SFTP_PASS="$1"

LOCAL_DIR="$(dirname "$0")/we4free_website"
if [ ! -d "$LOCAL_DIR" ]; then
  echo "ERROR: $LOCAL_DIR not found (run from repo root)." >&2
  exit 1
fi

if ! command -v lftp >/dev/null 2>&1; then
  echo "ERROR: lftp missing. Install: sudo apt-get install -y lftp" >&2
  exit 1
fi

echo "Deploying WE4Free site to $SFTP_USER@$SFTP_HOST:$SFTP_PORT"

lftp -u "$SFTP_USER","$SFTP_PASS" -p "$SFTP_PORT" "sftp://$SFTP_HOST" <<EOF
set ssl:verify-certificate no
set net:timeout 30
mirror -R --verbose --no-delete "$LOCAL_DIR" "$SFTP_PATH"
bye
EOF

echo "Deploy complete. Done."
