#!/usr/bin/env python3

"""
Rename a file by downloading it from the source uri and then uploading it to the destination uri with the new name.
This is done by generating a shell script that uses curl to download the file and then upload it to the new location with the new name.
The shell script is then executed and the file is renamed in place without needing to download it to the local machine first.
"""

# Standard library imports
from pathlib import Path
from textwrap import dedent
from tempfile import NamedTemporaryFile
from subprocess import run
from time import sleep
from os import environ
from urllib.parse import urlparse

# Layer imports
from icav2_tools import set_icav2_env_vars

# Wrapica imports
from wrapica.project_data import (
    create_download_url,
    get_project_data_obj_by_id,
    get_project_data_obj_from_project_id_and_path,
    create_file_with_upload_url, delete_project_data,
    convert_uri_to_project_data_obj
)

# Globals
POST_DELETION_WAIT_TIME = 5  # seconds


def get_shell_script_template() -> str:
    return dedent(
        """
        #!/usr/bin/env bash

        # Set to fail if any command fails, if any variable is unset, and to fail if any command in a pipeline fails
        set -euo pipefail

        # Download + upload
        # Then delete the original via the ICAv2 API
        (
            curl --fail --silent --show-error --location \
              "__DOWNLOAD_PRESIGNED_URL__" | \
            curl --fail --silent --show-error --location \
              --request PUT \
              --header 'Content-Type: application/octet-stream' \
              --data-binary "@-" \
              "__UPLOAD_PRESIGNED_URL__"
        ) && \
        curl --fail --silent --show-error --location \
          --request 'POST' \
          --header 'Accept: application/vnd.illumina.v3+json' \
          --header 'Authorization: Bearer __ICAV2_ACCESS_TOKEN__' \
          --data '' \
          '__ICAV2_BASE_URL__/api/projects/__PROJECT_ID__/data/__DATA_ID__:delete'
        """
    )


def generate_shell_script(
        source_file_download_url: str,
        destination_file_upload_url: str,
        icav2_base_url: str,
        icav2_access_token: str,
        project_id: str,
        data_id: str,
):
    # Create a temp file
    temp_file_path = NamedTemporaryFile(
        delete=False,
        suffix=".sh"
    ).name

    # Write the shell script to the temp file
    with open(temp_file_path, "w") as temp_file_h:
        temp_file_h.write(
            get_shell_script_template().replace(
                "__DOWNLOAD_PRESIGNED_URL__", source_file_download_url
            ).replace(
                "__UPLOAD_PRESIGNED_URL__", destination_file_upload_url
            ).replace(
                "__ICAV2_BASE_URL__", icav2_base_url
            ).replace(
                "__ICAV2_ACCESS_TOKEN__", icav2_access_token
            ).replace(
                "__PROJECT_ID__", project_id
            ).replace(
                "__DATA_ID__", data_id
            ) + "\n"
        )

    return temp_file_path


def run_shell_script(
        shell_script_path: str,
):
    """
    Run the shell script with the following environment variables set
    :param shell_script_path:
    :return:
    """
    proc = run(
        [
            "bash", shell_script_path
        ],
        capture_output=True
    )

    if not proc.returncode == 0:
        raise RuntimeError(
            f"Failed to run shell script {shell_script_path} with return code {proc.returncode}. "
            f"Stdout was {proc.stdout.decode()}"
            f"Stderr was {proc.stderr.decode()}"
        )

    return


def handler(event, context):
    """
    Given the inputs of
    :param event:
    :param context:
    :return:
    """
    # Set env vars
    set_icav2_env_vars()

    # Get inputs
    project_id = event["projectId"]
    input_data_id = event["inputDataId"]
    output_data_uri = event["outputDataUri"]

    # Get the output data file name
    output_file_name = Path(urlparse(output_data_uri).path).name

    # Get the source file object
    source_object = get_project_data_obj_by_id(
        project_id=project_id,
        data_id=input_data_id
    )
    # Get the destination object
    destination_object = convert_uri_to_project_data_obj(
        output_data_uri,
        create_data_if_not_found=True,
    )
    # Check destination object is a file
    if not destination_object.data.details.data_type == 'FILE':
        raise ValueError("Expected data type to be a file")

    # Also check that the destination object is different to the source object
    if (
            source_object.project_id == destination_object.project_id and
            source_object.data.id == destination_object.data.id
    ):
        raise ValueError("Expected source and destination objects to be different")

    # Delete the newly created destination object (since we're going to overwrite it anyway)
    delete_project_data(
        project_id=destination_object.project_id,
        data_id=destination_object.data.id
    )
    # Give servers ample time to catch up
    sleep(POST_DELETION_WAIT_TIME)

    # Get the folder object
    destination_folder_object = get_project_data_obj_from_project_id_and_path(
        project_id=destination_object.project_id,
        data_path=Path(destination_object.data.details.path).parent,
        data_type="FOLDER"
    )

    # Create the source file download url
    source_file_download_url = create_download_url(
        project_id=source_object.project_id,
        file_id=source_object.data.id,
    )

    # Create the file object
    destination_file_upload_url = create_file_with_upload_url(
        project_id=destination_folder_object.project_id,
        folder_id=destination_folder_object.data.id,
        file_name=output_file_name
    )

    # Get the shell script
    shell_script_path = generate_shell_script(
        source_file_download_url=source_file_download_url,
        destination_file_upload_url=destination_file_upload_url,
        # Set when set_icav2_env_vars is called
        icav2_base_url=environ['ICAV2_BASE_URL'],
        icav2_access_token=environ['ICAV2_ACCESS_TOKEN'],
        project_id=str(project_id),
        data_id=str(source_object.data.id),
    )

    # Run the shell script
    run_shell_script(
        shell_script_path=shell_script_path,
    )
