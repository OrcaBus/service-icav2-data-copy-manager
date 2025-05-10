#!/usr/bin/env python3

"""
Check the job status of a job id
"""
from wrapica.job import get_job


#!/usr/bin/env python3

"""
Lambda to determine if a given ICAv2 Copy Job has finished.
Returns the status of the job which is one of the following
* INITIALIZED
* WAITING_FOR_RESOURCES
* RUNNING
* STOPPED
* SUCCEEDED
* PARTIALLY_SUCCEEDED
* FAILED

The event input is
{
    "dest_uri": "icav2://path/to/destination/folder/"
    "source_uris": [
        "icav2://path/to/data",
        "icav2://path/to/data2",
    ]
    "job_id": null  # Or the job id abcd-1234-efgh-5678
    "failed_job_list": []  # Empty list or list of failed jobs
    "job_status": One of RUNNING, SUCCEEDED or FAILED (not the same as the job states, we rerun)
    "wait_time_seconds": int  # Number of seconds to wait before checking the job status - we add 10 seconds each time we go through this loop
}

"""

# Standard imports
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import List, Dict
import boto3
from os import environ
import typing
import logging
import re

# Wrapica imports
from wrapica.libica_models import ProjectData
from wrapica.enums import ProjectDataStatusValues, DataType
from wrapica.project_data import (
    convert_uri_to_project_data_obj, project_data_copy_batch_handler,
    delete_project_data,
    list_project_data_non_recursively,
    write_icav2_file_contents, read_icav2_file_contents,
    get_project_data_obj_from_project_id_and_path,
    get_project_data_obj_by_id
)

if typing.TYPE_CHECKING:
    from mypy_boto3_ssm import SSMClient
    from mypy_boto3_secretsmanager import SecretsManagerClient

# Set logging
logging.basicConfig()
logger = logging.getLogger()
logger.setLevel(level=logging.INFO)

# Constants
TINY_FILE_SIZE_LIMIT = 8388608  # 8 MiB (8 * 2^20)
MULTI_PART_ETAG_REGEX = re.compile(r"\w+-\d+")

# Try a job 10 times before giving up
MAX_JOB_ATTEMPT_COUNTER = 10
DEFAULT_WAIT_TIME_SECONDS = 10
DEFAULT_WAIT_TIME_SECONDS_EXT = 10

# Globals
ICAV2_BASE_URL = "https://ica.illumina.com/ica/rest"


# AWS things
def get_ssm_client() -> 'SSMClient':
    """
    Return SSM client
    """
    return boto3.client("ssm")


def get_secrets_manager_client() -> 'SecretsManagerClient':
    """
    Return Secrets Manager client
    """
    return boto3.client("secretsmanager")


def get_ssm_parameter_value(parameter_path) -> str:
    """
    Get the ssm parameter value from the parameter path
    :param parameter_path:
    :return:
    """
    return get_ssm_client().get_parameter(Name=parameter_path)["Parameter"]["Value"]


def get_secret(secret_arn: str) -> str:
    """
    Return secret value
    """
    return get_secrets_manager_client().get_secret_value(SecretId=secret_arn)["SecretString"]


# Set the icav2 environment variables
def set_icav2_env_vars():
    """
    Set the icav2 environment variables
    :return:
    """
    environ["ICAV2_BASE_URL"] = ICAV2_BASE_URL
    environ["ICAV2_ACCESS_TOKEN"] = get_secret(
        environ["ICAV2_ACCESS_TOKEN_SECRET_ID"]
    )

def summarise_job_status(job_status: str) -> str:
    if job_status in ['INITIALIZED', 'WAITING_FOR_RESOURCES', 'RUNNING']:
        return 'RUNNING'
    if job_status in ['STOPPED', 'PARTIALLY_SUCCEEDED', 'FAILED']:
        return 'FAILED'
    return 'SUCCEEDED'


def handler(event, context):
    """
    Get the job status of a job id
    :param event:
    :param context:
    :return:
    """
    set_icav2_env_vars()

    # Get params
    job_id: str = event.get("jobId")

    # Get job object
    job_status = get_job(job_id).status

    # Check we have a job to run
    return {
        "status": summarise_job_status(job_status)
    }
