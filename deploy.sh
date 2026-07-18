#!/usr/bin/env bash
#
# WE4Free deploy script
# Uploads ./we4free_website/* to the Hostinger Business Web Hosting account
# for deliberateensemble.works (serves orangered-jellyfish-637583.hostingersite.com).
#
# Credentials are read from ./.deploy.env (gitignored). NEVER commit the password.
# Required vars in .deploy.env:
#   SFTP_HOST=88.223.85.164
#   SFTP_PORT=65002
#   SFTP_USER=u526066719.deliberateensemble.works
#   SFTP_PASS=your-ftp-or-ssh-password
#   SFTP_PATH=/home/u526066719/domains/deliberateensemble.works/public_html
#
set -euo pipefail

ENV_FILE="$(dirname "$0")/.deploy.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found." >&2
  echo "Create it with SFTP_HOST, SFTP_PORT, SFTP_USER, SFTP_PASS, SFTP_PATH." >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

LOCAL_DIR="$(dirname "$0")/we4free_website"

if [ ! -d "$LOCAL_DIR" ]; then
  echo "ERROR: $LOCAL_DIR not found (run from repo root)." >&2
  exit 1
fi

if ! command -v lftp >/dev/null 2>&1; then
  echo "ERROR: lftp not installed. On Ubuntu: sudo apt-get install -y lftp" >&2
  exit 1
fi

echo "Deploying $LOCAL_DIR -> $SFTP_USER@$SFTP_HOST:$SFTP_PORT$SFTP_PATH"

lftp -u "$SFTP_USER","$SFTP_PASS" -p "$SFTP_PORT" "sftp://$SFTP_HOST" <<EOF
set ssl:verify-certificate no
set net:timeout 30
mirror -R --delete --verbose "$LOCAL_DIR" "$SFTP_PATH"
bye
EOF

echo "Deploy complete."
