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

curl \
  --fail-with-body --silent --show-error --location \
  --request GET \
  --url "__DOWNLOAD_PRESIGNED_URL__" | \
curl --fail-with-body --silent --show-error --location \
  --request PUT \
  --header 'Content-Type: application/octet-stream' \
  --data-binary "@-" \
  --url "__UPLOAD_PRESIGNED_URL__"
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
import os
from os import environ
from pathlib import Path
from textwrap import dedent
from tempfile import NamedTemporaryFile
from subprocess import run
from time import sleep
import argparse
from urllib.parse import urlunparse, urlparse
import requests

# Wrapica imports
from libica.openapi.v3 import ProjectData
from wrapica.project_data import (
    get_project_data_obj_by_id,
    get_project_data_obj_from_project_id_and_path,
    create_file_with_upload_url,
    delete_project_data, get_aws_credentials_access_for_project_folder
)
from wrapica.utils.globals import FILE_DATA_TYPE

# Globals
POST_DELETION_WAIT_TIME = 5  # seconds, time to wait after deleting a file before trying to upload again
ORCABUS_TOKEN_ENV_VAR = "ORCABUS_TOKEN"
HOSTNAME_ENV_VAR = "HOSTNAME"


def get_presigned_url_from_filemanager_uri(filemanager_uri: str) -> str:
    """
    Get the presigned url for the filemanager uri
    :param filemanager_uri:
    :return:
    """
    filemanager_uri_obj = urlparse(filemanager_uri)
    get_obj_req = requests.get(
        url=f"https://file.{environ[HOSTNAME_ENV_VAR]}/api/v1/s3",
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {environ[ORCABUS_TOKEN_ENV_VAR]}"
        },
        params={
            "currentState": str(True).lower(),
            "bucket": filemanager_uri_obj.netloc,
            "key": filemanager_uri_obj.path.lstrip('/')
        },
    )
    get_obj_req.raise_for_status()
    object_id = get_obj_req.json()['results'][0]['s3ObjectId']

    presign_req = requests.get(
        url=f"https://file.{environ[HOSTNAME_ENV_VAR]}/api/v1/s3/presign/{object_id}",
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {environ[ORCABUS_TOKEN_ENV_VAR]}"
        },
        params={
            'responseContentDisposition': 'inline'
        },
    )
    presign_req.raise_for_status()
    return presign_req.json()


def get_shell_script_template_for_single_part_file() -> str:
    """

    :return:
    """
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


def get_shell_script_template_for_multipart_file() -> str:
    """

    :return:
    """
    return dedent(
        """
        #!/usr/bin/env bash

        set -euo pipefail

        # Download the file and upload it simulatenously
        # Rather than using the icav2 upload url, we use the AWS CLI to upload to S3 directly,
        # Since the AWS CLI can handle multipart uploads for large files, whereas curl cannot
        curl \
          --fail-with-body --silent --show-error --location \
          --request GET \
          --url "__DOWNLOAD_PRESIGNED_URL__" | \
        aws s3 cp \
          --expected-size "__FILE_SIZE_IN_BYTES__" \
          - \
          "__DESTINATION_S3_PATH__"
        """
    )


def generate_single_part_shell_script(
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
            get_shell_script_template_for_single_part_file().replace(
                "__DOWNLOAD_PRESIGNED_URL__", source_file_download_url
            ).replace(
                "__UPLOAD_PRESIGNED_URL__", destination_file_upload_url
            ) + "\n"
        )

    return temp_file_path


def generate_multi_part_shell_script(
        source_presigned_url: str,
        destination_file_s3_path: str,
        file_size_in_bytes: int
):
    # Create a temp file
    temp_file_path = NamedTemporaryFile(
        delete=False,
        suffix=".sh"
    ).name

    # Write the shell script to the temp file
    with open(temp_file_path, "w") as temp_file_h:
        temp_file_h.write(
            get_shell_script_template_for_multipart_file().replace(
                "__DOWNLOAD_PRESIGNED_URL__", source_presigned_url
            ).replace(
                "__DESTINATION_S3_PATH__", destination_file_s3_path
            ).replace(
                "__FILE_SIZE_IN_BYTES__", str(file_size_in_bytes)
            ) + "\n"
        )

    return temp_file_path



def run_shell_script(
        destination_folder_object: ProjectData,
        shell_script_path: str,
):
    """
    Run the shell script with the following environment variables set
    :param shell_script_path:
    :param destination_folder_object: We need the destination folder object to get the AWS credentials for the destination path
    :return:
    """
    storage_creds = get_aws_credentials_access_for_project_folder(
        project_id=destination_folder_object.project_id,
        folder_id=destination_folder_object.data.id
    )
    env = os.environ.copy()
    env.update(
        {
            'AWS_REGION': storage_creds.region,
            'AWS_ACCESS_KEY_ID': storage_creds.access_key,
            'AWS_SECRET_ACCESS_KEY': storage_creds.secret_key,
            'AWS_SESSION_TOKEN': storage_creds.session_token,
        }
    )
    proc = run(
        [
            "bash", shell_script_path
        ],
        capture_output=True,
        env=env
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
        "--source-uri",
        type=str,
        required=True,
        help="The uri of the source file"
    )
    args.add_argument(
        "--file-size-in-bytes",
        type=int,
        required=True,
        help="The file size of the source file in bytes. For large files we need to use the multipart upload script, which requires the file size to be specified."
    )
    args.add_argument(
        "--is-multipart-file",
        action='store_true',
        help="Whether the source file is a multipart file."
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

    # Get the source uri object from the filemanager uri
    source_presigned_url = get_presigned_url_from_filemanager_uri(args.source_uri)
    source_filesize_in_bytes = args.file_size_in_bytes
    is_multipart_file = args.is_multipart_file

    # Get the destination folder object
    destination_folder_object = get_project_data_obj_by_id(
        project_id=args.dest_project_id,
        data_id=args.dest_data_id
    )

    # Determine if the source object is a single part of multi part file based on the etag
    if is_multipart_file:
        # Multi part file, we can use aws s3 cp with --expected-size
        storage_creds = get_aws_credentials_access_for_project_folder(
            project_id=destination_folder_object.project_id,
            folder_id=destination_folder_object.data.id
        )
        shell_script_path = generate_multi_part_shell_script(
            source_presigned_url=source_presigned_url,
            destination_file_s3_path=str(urlunparse((
                's3',
                storage_creds.bucket,
                str(Path(storage_creds.object_prefix) / Path(args.source_uri).name),
                None, None, None
            ))),
            file_size_in_bytes=source_filesize_in_bytes
        )
        run_shell_script(
            destination_folder_object=destination_folder_object,
            shell_script_path=shell_script_path,
        )
        return
    else:
        # Check if the destination file exists
        try:
            existing_project_data_obj = get_project_data_obj_from_project_id_and_path(
                project_id=destination_folder_object.project_id,
                data_path=Path(destination_folder_object.data.details.path) / Path(args.source_uri).name,
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
            elif existing_project_data_obj.data.details.file_size_in_bytes == source_filesize_in_bytes:
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
            file_name=Path(args.source_uri).name
        )

        # Get the shell script
        shell_script_path = generate_single_part_shell_script(
            source_file_download_url=source_presigned_url,
            destination_file_upload_url=destination_file_upload_url,
        )

        # Run the shell script
        run_shell_script(
            shell_script_path=shell_script_path,
            destination_folder_object=destination_folder_object
        )


if __name__ == "__main__":
    main()
