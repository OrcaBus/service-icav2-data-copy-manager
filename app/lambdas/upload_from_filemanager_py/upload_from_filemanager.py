#!/usr/bin/env python3

"""
Upload a file from the OrcaBus filemanager to an ICAv2 project via a download+upload

External data is managed by the filemanager
"""

# Standard imports
from pathlib import Path
from subprocess import run
from tempfile import NamedTemporaryFile
from textwrap import dedent
from time import sleep

# Layer imports
from icav2_tools import set_icav2_env_vars
from orcabus_api_tools.filemanager import (
    get_s3_object_id_from_s3_uri,
    get_presigned_url
)

from wrapica.project_data import (
    get_project_data_obj_by_id,
    get_project_data_obj_from_project_id_and_path,
    delete_project_data,
    create_file_with_upload_url
)
from wrapica.utils.globals import FILE_DATA_TYPE

# Globals
POST_DELETION_WAIT_TIME = 5  # seconds


def get_shell_script_template() -> str:
    return dedent(
        """
        #!/usr/bin/env bash

        set -euo pipefail

        curl --location \
         "__DOWNLOAD_PRESIGNED_URL__" | \
        curl --location \
          --request PUT \
          --header 'Content-Type: application/octet-stream' \
          --data-binary "@-" \
          "__UPLOAD_PRESIGNED_URL__"
        """
    )


def generate_shell_script(
        source_file_download_url: str,
        destination_file_upload_url: str,
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
    set_icav2_env_vars()

    # Source args
    source_uri = event['sourceUri']

    # Source file size
    source_file_size_in_bytes = event['sourceFileSizeInBytes']

    # Dest args
    dest_project_id = event['destProjectId']
    dest_data_id = event['destDataId']

    # Use the filemanager to get the presigned url of the source uri file
    source_file_download_url = get_presigned_url(
        s3_object_id=get_s3_object_id_from_s3_uri(source_uri)
    )

    # Get the destination folder object
    destination_folder_object = get_project_data_obj_by_id(
        project_id=dest_project_id,
        data_id=dest_data_id,
    )

    # Check if the destination file exists
    try:
        existing_project_data_obj = get_project_data_obj_from_project_id_and_path(
            project_id=destination_folder_object.project_id,
            data_path=Path(destination_folder_object.data.details.path) / Path(source_uri).name,
            data_type=FILE_DATA_TYPE
        )
        # If we have a partial file, we can delete it and re-upload
        if existing_project_data_obj.data.details.status == 'PARTIAL':
            # Delete the file
            delete_project_data(
                project_id=destination_folder_object.project_id,
                data_id=existing_project_data_obj.data.id
            )
            # Wait for the db to catch up
            sleep(POST_DELETION_WAIT_TIME)
        elif existing_project_data_obj.data.details.file_size_in_bytes == source_file_size_in_bytes:
            # If the file sizes match, we can skip the upload
            # Check the file sizes match
            return
        else:
            raise RuntimeError(
                f"File {existing_project_data_obj.data.details.path} already exists in destination folder "
                f"with a different file size. Cannot overwrite."
            )

    except FileNotFoundError:
        pass

    # Create the file object
    destination_file_upload_url = create_file_with_upload_url(
        project_id=destination_folder_object.project_id,
        folder_id=destination_folder_object.data.id,
        file_name=Path(source_uri).name,
    )

    # Get the shell script
    shell_script_path = generate_shell_script(
        source_file_download_url,
        destination_file_upload_url
    )

    # Run the shell script
    run_shell_script(
        shell_script_path=shell_script_path,
    )
