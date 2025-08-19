#!/usr/bin/env python3

"""
Upload a single part file to S3 using the boto3 library.

Rather than download + upload we perform the following steps:

1. Get AWS credentials for the parent directory

2. Get the file size of the file to be uploaded

3. Generate a presigned URL for the file to be downloaded

4. Create a temp shell script with the following template:

'
#!/usr/bin/env bash

set -euo pipefail

wget \
 --quiet \
 --output-document /dev/stdout \
 "{__PRESIGNED_URL__}" | \
aws s3 cp --expected-size "${__FILE_SIZE_IN_BYTES__}" - "${__DESTINATION_PATH__}"
'

We then run the shell script through subprocess.run with the following environment variables set

1. AWS_ACCESS_KEY_ID - the access key id for this destination path
2. AWS_SECRET_ACCESS_KEY - the secret access key for this destination path
3. AWS_SESSION_TOKEN - the session token for this destination path

We take in the following inputs:

{
    "sourceData": {
      "projectId": "abcdefghijklmnop",
      "dataId": "fil.abcdefghijklmnop",
    }
    "destinationData": {
      "projectId": "abcdefghijklmnop",
      "dataId": "fil.abcdefghijklmnop",
    }
}
"""

# Standard library imports
from pathlib import Path
from textwrap import dedent
from tempfile import NamedTemporaryFile
from subprocess import run
from time import sleep
import argparse

# Wrapica imports
from wrapica.project_data import (
    create_download_url,
    get_project_data_obj_by_id,
    get_project_data_obj_from_project_id_and_path,
    create_file_with_upload_url,
    delete_project_data
)
from wrapica.utils.globals import FILE_DATA_TYPE

# Globals
POST_DELETION_WAIT_TIME = 5  # seconds, time to wait after deleting a file before trying to upload again

def get_shell_script_template() -> str:
    return dedent(
        """
        #!/usr/bin/env bash

        set -euo pipefail

        # Download the file and upload it
        # This actually downloads the entire file into memory before uploading it
        curl \
          --fail-with-body --silent --show-error --location \
          --request GET \
          --url "__DOWNLOAD_PRESIGNED_URL__" | \
        curl --fail-with-body --silent --show-error --location \
          --request PUT \
          --header 'Content-Type: application/octet-stream' \
          --data-binary "@-" \
          --url "__UPLOAD_PRESIGNED_URL__"
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


def get_args():
    """
    Use argparse, to get the arguments from the command line.
    We collect the following arguments
    * --source-project-id
    * --source-data-id
    * --destination-project-id
    * --destination-data-id
    :return:
    """
    # Get args
    args = argparse.ArgumentParser(
        description="Upload a single part file to ICAv2 with curl PUT"
    )

    # Source args
    args.add_argument(
        "--source-project-id",
        type=str,
        required=True,
        help="The project ID of the source file to be uploaded."
    )
    args.add_argument(
        "--source-data-id",
        type=str,
        required=True,
        help="The data ID of the source file to be uploaded."
    )

    # Dest args
    args.add_argument(
        "--dest-project-id",
        type=str,
        required=True,
        help="The project ID of the dest file to be uploaded."
    )
    args.add_argument(
        "--dest-data-id",
        type=str,
        required=True,
        help="The data ID of the dest folder the file should be uploaded to."
    )

    return args.parse_args()


def main():
    """
    Given the inputs of
    :param event:
    :param context:
    :return:
    """
    args = get_args()

    # Get the source file object
    source_object = get_project_data_obj_by_id(
        project_id=args.source_project_id,
        data_id=args.source_data_id
    )
    # Get the destination folder object
    destination_folder_object = get_project_data_obj_by_id(
        project_id=args.dest_project_id,
        data_id=args.dest_data_id
    )

    # Create the source file download url
    source_file_download_url = create_download_url(
        project_id=source_object.project_id,
        file_id=source_object.data.id,
    )

    # Check if the destination file exists
    try:
        existing_project_data_obj = get_project_data_obj_from_project_id_and_path(
            project_id=destination_folder_object.project_id,
            data_path=Path(destination_folder_object.data.details.path) / source_object.data.details.name,
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
        elif existing_project_data_obj.data.details.file_size_in_bytes == source_object.data.details.file_size_in_bytes:
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
        file_name=source_object.data.details.name
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


if __name__ == "__main__":
    main()
