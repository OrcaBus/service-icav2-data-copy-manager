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
from typing import List, Dict
import boto3
from os import environ
import typing
import logging
import re

# Layer imports
from icav2_tools import set_icav2_env_vars

# Wrapica imports
from wrapica.libica_models import ProjectData
from wrapica.project_data import (
    convert_uri_to_project_data_obj, project_data_copy_batch_handler,
    delete_project_data,
    list_project_data_non_recursively,
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


def submit_copy_job(dest_project_data_obj: ProjectData, source_project_data_objs: List[ProjectData]) -> str:
    # Rerun copy batch process
    source_data_ids = list(
        map(
            lambda source_project_data_obj_iter_: source_project_data_obj_iter_.data.id,
            source_project_data_objs
        )
    )

    return project_data_copy_batch_handler(
        source_data_ids=source_data_ids,
        destination_project_id=dest_project_data_obj.project_id,
        destination_folder_path=Path(dest_project_data_obj.data.details.path)
    ).id


def delete_existing_partial_data(
        dest_project_data_obj: ProjectData,
        source_project_data_obj_list: List[ProjectData] = None
):
    # Source data names
    source_data_names = list(map(
        lambda source_project_data_obj_iter_: source_project_data_obj_iter_.data.details.name,
        source_project_data_obj_list
    ))

    # Check list of files in the dest project data object and make sure no file has a partial status
    existing_partial_files = list(filter(
        lambda file_iter_: (
            # File has a partial status AND
            file_iter_.data.details.status == 'PARTIAL' and
            # File name is in the list of files we
            # want to copy over
            file_iter_.data.details.name in source_data_names
        ),
        list_project_data_non_recursively(
            dest_project_data_obj.project_id,
            dest_project_data_obj.data.id
        )
    ))

    for existing_file in existing_partial_files:
        logger.info(f"Deleting file {existing_file.data.details.path}, with 'partial' status before rerunning job")
        # Delete files with a 'partial' status
        delete_project_data(
            existing_file.project_id,
            existing_file.data.id
        )


def get_source_uris_as_project_data_objs(source_uris: List[str]) -> List[ProjectData]:
    # Get source uris as project data objects
    return list(
        map(
            lambda source_uri_iter: convert_uri_to_project_data_obj(
                source_uri_iter
            ),
            source_uris
        )
    )


def handler(event, context):
    """

    :param event:
    :param context:
    :return:
    """
    set_icav2_env_vars()

    # Get events
    source_data_list: List[Dict[str, str]] = event.get("sourceDataList")
    destination_data: Dict[str, str] = event.get("destinationData")

    # Get destination uri as project data object
    logger.info("Running job to copy files")
    dest_project_data_obj = get_project_data_obj_by_id(
        project_id=destination_data.get("projectId"),
        data_id=destination_data.get("dataId")
    )

    # Get Source Uris as project data objects
    # Filter out files smaller than the min file size limit
    # These are transferred over manually
    source_project_data_list = list(map(
        lambda source_data_id_iter_: get_project_data_obj_by_id(
            project_id=source_data_id_iter_.get("projectId"),
            data_id=source_data_id_iter_.get("dataId")
        ),
        source_data_list
    ))

    # First time through
    logger.info("Delete any existing partial data before running job")
    delete_existing_partial_data(
        dest_project_data_obj,
        source_project_data_list
    )

    # Check we have a job to run
    return {
        "jobId": submit_copy_job(
            dest_project_data_obj=dest_project_data_obj,
            source_project_data_objs=source_project_data_list,
        ),
    }


# Just Small files
# if __name__ == "__main__":
#     import json
#     environ['AWS_PROFILE'] = 'umccr-development'
#     environ['AWS_DEFAULT_REGION'] = 'ap-southeast-2'
#     environ['ICAV2_ACCESS_TOKEN_SECRET_ID'] = 'ICAv2JWTKey-umccr-prod-service-dev'
#     print(
#         json.dumps(
#             handler(
#                 event={
#                 "job_id": None,
#                 "failed_job_list": [],
#                 "wait_time_seconds": 5,
#                 "job_status": None,
#                 "dest_uri": "icav2://ea19a3f5-ec7c-4940-a474-c31cd91dbad4/cache/cttsov2/20241031d8a13553/L2401532/",
#                 "source_uris": [
#                     "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/241024_A00130_0336_BHW7MVDSXC/20241030c613872c/Samples/Lane_1/L2401532/L2401532_S7_L001_R1_001.fastq.gz",
#                     "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/241024_A00130_0336_BHW7MVDSXC/20241030c613872c/Samples/Lane_1/L2401532/L2401532_S7_L001_R2_001.fastq.gz"
#                 ],
#               },
#                 context=None
#             ),
#             indent=4
#         )
#     )
#
#     # {
#     #     "dest_uri": "icav2://ea19a3f5-ec7c-4940-a474-c31cd91dbad4/cache/cttsov2/20241031d8a13553/L2401532/",
#     #     "source_uris": [
#     #         "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/241024_A00130_0336_BHW7MVDSXC/20241030c613872c/Samples/Lane_1/L2401532/L2401532_S7_L001_R1_001.fastq.gz",
#     #         "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/241024_A00130_0336_BHW7MVDSXC/20241030c613872c/Samples/Lane_1/L2401532/L2401532_S7_L001_R2_001.fastq.gz"
#     #     ],
#     #     "job_id": null,
#     #     "failed_job_list": [],
#     #     "job_status": "SUCCEEDED",
#     #     "wait_time_seconds": 10
#     # }


# Copy files with mixed small and large
# if __name__ == "__main__":
#     import json
#     environ['AWS_PROFILE'] = 'umccr-development'
#     environ['AWS_DEFAULT_REGION'] = 'ap-southeast-2'
#     environ['ICAV2_ACCESS_TOKEN_SECRET_ID'] = 'ICAv2JWTKey-umccr-prod-service-dev'
#     print(
#         json.dumps(
#             handler(
#                 event={
#                 "job_id": None,
#                 "failed_job_list": [],
#                 "wait_time_seconds": 5,
#                 "job_status": None,
#                 "dest_uri": "icav2://ea19a3f5-ec7c-4940-a474-c31cd91dbad4/cache/cttsov2/20241031d8a13553/small-files-copy-test/",
#                 "source_uris": [
#                     "icav2://development/primary/241024_A00130_0336_BHW7MVDSXC/20241030c613872c/Samples/Lane_1/small-files/chunk_file_size_8mb.bin",
#                     "icav2://development/primary/241024_A00130_0336_BHW7MVDSXC/20241030c613872c/Samples/Lane_1/small-files/chunk_file_size_8mb_minus_1.bin"
#                 ],
#               },
#                 context=None
#             ),
#             indent=4
#         )
#     )
#
#     # {
#     #     "dest_uri": "icav2://ea19a3f5-ec7c-4940-a474-c31cd91dbad4/cache/cttsov2/20241031d8a13553/L2401532/",
#     #     "source_uris": [
#     #         "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/241024_A00130_0336_BHW7MVDSXC/20241030c613872c/Samples/Lane_1/L2401532/L2401532_S7_L001_R1_001.fastq.gz",
#     #         "s3://pipeline-dev-cache-503977275616-ap-southeast-2/byob-icav2/development/primary/241024_A00130_0336_BHW7MVDSXC/20241030c613872c/Samples/Lane_1/L2401532/L2401532_S7_L001_R2_001.fastq.gz"
#     #     ],
#     #     "job_id": null,
#     #     "failed_job_list": [],
#     #     "job_status": "SUCCEEDED",
#     #     "wait_time_seconds": 10
#     # }
