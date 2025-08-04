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
import logging
import re

# Layer imports
from icav2_tools import set_icav2_env_vars

# Wrapica imports
from wrapica.job import get_job

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
