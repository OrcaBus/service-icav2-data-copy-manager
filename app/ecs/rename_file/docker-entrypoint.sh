#!/usr/bin/env bash

set -euo pipefail

# Quick function to log messages to stderr
echo_stderr(){
  echo "$(date -Iseconds)" "$@" >&2
}

# Confirm the following environment variables are set
# ICAV2_ACCESS_TOKEN_SECRET_ID
# PROJECT_ID
# INPUT_DATA_ID
# OUTPUT_DATA_URI

if [[ -z "${ICAV2_ACCESS_TOKEN_SECRET_ID:-}" ]]; then
  echo_stderr "ICAV2_ACCESS_TOKEN_SECRET_ID is not set. Exiting."
  exit 1
fi

if [[ -z "${PROJECT_ID:-}" ]]; then
  echo_stderr "PROJECT_ID is not set. Exiting."
  exit 1
fi

if [[ -z "${INPUT_DATA_ID:-}" ]]; then
  echo_stderr "INPUT_DATA_ID is not set. Exiting."
  exit 1
fi

if [[ -z "${OUTPUT_DATA_URI:-}" ]]; then
  echo_stderr "OUTPUT_DATA_URI is not set. Exiting."
  exit 1
fi

# Set ICAV2_ACCESS_TOKEN environment variable
ICAV2_ACCESS_TOKEN="$( \
  aws secretsmanager get-secret-value \
    --secret-id "${ICAV2_ACCESS_TOKEN_SECRET_ID}" \
    --output json \
    --query SecretString | \
  jq --raw-output
)"
export ICAV2_ACCESS_TOKEN

# Run the Python script
uv run python3 scripts/rename_file.py \
  --project-id "${PROJECT_ID}" \
  --data-id "${INPUT_DATA_ID}" \
  --output-data-uri "${OUTPUT_DATA_URI}"
