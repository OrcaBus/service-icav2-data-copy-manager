#!/usr/bin/env bash

set -euo pipefail

# Quick function to log messages to stderr
echo_stderr(){
  echo "$(date -Iseconds)" "$@" >&2
}

# Confirm the following environment variables are set
# ICAV2_ACCESS_TOKEN_SECRET_ID
# SOURCE_PROJECT_ID
# SOURCE_DATA_ID
# DEST_PROJECT_ID
# DEST_DATA_ID

if [[ -z "${ICAV2_ACCESS_TOKEN_SECRET_ID:-}" ]]; then
  echo_stderr "ICAV2_ACCESS_TOKEN_SECRET_ID is not set. Exiting."
  exit 1
fi

if [[ -z "${SOURCE_PROJECT_ID:-}" ]]; then
  echo_stderr "SOURCE_PROJECT_ID is not set. Exiting."
  exit 1
fi

if [[ -z "${SOURCE_DATA_ID:-}" ]]; then
  echo_stderr "SOURCE_DATA_ID is not set. Exiting."
  exit 1
fi

if [[ -z "${DEST_PROJECT_ID:-}" ]]; then
  echo_stderr "DEST_PROJECT_ID is not set. Exiting."
  exit 1
fi

if [[ -z "${DEST_DATA_ID:-}" ]]; then
  echo_stderr "DEST_DATA_ID is not set. Exiting."
  exit 1
fi

# Set ICAV2_ACCESS_TOKEN environment variable
ICAV2_ACCESS_TOKEN="$( \
  aws secretsmanager get-secret-value \
    --secret-id "${ICAV2_ACCESS_TOKEN_SECRET_ID}" \
    --output json | \
  jq --raw-output '.SecretString' \
)"
export ICAV2_ACCESS_TOKEN

# Run the Python script
uv run python3 scripts/upload_single_part_file.py \
  --source-project-id "${SOURCE_PROJECT_ID}" \
  --source-data-id "${SOURCE_DATA_ID}" \
  --dest-project-id "${DEST_PROJECT_ID}" \
  --dest-data-id "${DEST_DATA_ID}"
