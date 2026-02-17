#!/usr/bin/env bash

set -euo pipefail

# Quick function to log messages to stderr
echo_stderr(){
  echo "$(date -Iseconds)" "$@" >&2
}

# Confirm the following environment variables are set
# ICAV2_ACCESS_TOKEN_SECRET_ID
# ORCABUS_TOKEN_SECRET_ID
# HOSTNAME_SSM_PARAMETER_NAME
# SOURCE_URI
# FILE_SIZE_IN_BYTES
# IS_MULTIPART_FILE
# DEST_PROJECT_ID
# DEST_DATA_ID

# Static environment variable checks
if [[ -z "${ICAV2_ACCESS_TOKEN_SECRET_ID:-}" ]]; then
  echo_stderr "ICAV2_ACCESS_TOKEN_SECRET_ID is not set. Exiting."
  exit 1
fi

if [[ -z "${ORCABUS_TOKEN_SECRET_ID:-}" ]]; then
  echo_stderr "ORCABUS_TOKEN_SECRET_ID is not set. Exiting."
  exit 1
fi

if [[ -z "${HOSTNAME_SSM_PARAMETER_NAME:-}" ]]; then
  echo_stderr "HOSTNAME_SSM_PARAMETER_NAME is not set. Exiting."
  exit 1
fi

# Dynamic environment variable checks
if [[ -z "${SOURCE_URI:-}" ]]; then
  echo_stderr "SOURCE_URI is not set. Exiting."
  exit 1
fi

if [[ -z "${FILE_SIZE_IN_BYTES:-}" ]]; then
  echo_stderr "FILE_SIZE_IN_BYTES is not set. Exiting."
  exit 1
fi

if [[ -z "${IS_MULTIPART_FILE:-}" ]]; then
  echo_stderr "IS_MULTIPART_FILE is not set. Exiting."
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

# Set ORCABUS_TOKEN environment variable
ORCABUS_TOKEN="$( \
  aws secretsmanager get-secret-value \
	--secret-id "${ORCABUS_TOKEN_SECRET_ID}" \
	--output json | \
  jq --raw-output '.SecretString' \
)"
export ORCABUS_TOKEN

# Set the HOSTNAME environment variable
HOSTNAME="$( \
  aws ssm get-parameter \
	--name "${HOSTNAME_SSM_PARAMETER_NAME}" \
	--output json | \
  jq --raw-output '.Parameter.Value' \
)"
export HOSTNAME

# Run the Python script
uv run python3 scripts/upload_from_filemanager.py \
  --source-uri "${SOURCE_URI}" \
  --file-size-in-bytes "${FILE_SIZE_IN_BYTES}" \
  --is-multipart-file "${IS_MULTIPART_FILE}" \
  --dest-project-id "${DEST_PROJECT_ID}" \
  --dest-data-id "${DEST_DATA_ID}"
