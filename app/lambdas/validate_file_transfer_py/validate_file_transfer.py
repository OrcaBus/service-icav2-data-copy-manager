#!/usr/bin/env python3

"""
Given either one of the following sets of inputs:
- fileSizeInBytes
- outputUri
OR
- destinationUri
- sourceDataUri

Perform the following validations:

If given fileSizeInBytes and outputUri,
validate that the outputUri filesize matches the fileSizeInBytes value

If given destinationUri and sourceDataUri,
The destinationUri provided is a folder, extend with the filename from the sourceDataUri and validate that the file exists
at the extended destinationUri and that the filesize matches the sourceDataUri filesize
"""
# Standard imports
from pathlib import Path
from urllib.parse import urlparse

# Wrapica imports
from wrapica.project_data import coerce_data_id_or_uri_to_project_data_obj

# Orcabus layer imports
from orcabus_api_tools.filemanager import get_file_object_from_s3_uri
from icav2_tools import set_icav2_env_vars
from orcabus_api_tools.filemanager.errors import S3FileNotFoundError


def get_filesize_from_uri(uri: str) -> int:
    # First try to get the file from the filemanager
    # Otherwise try from the ICAv2 project data object
    uri_obj = urlparse(uri)

    if uri_obj.scheme == 's3':
        s3_obj = get_file_object_from_s3_uri(uri)
        file_size = s3_obj['size']
    elif uri_obj.scheme == 'icav2':
        project_data_obj = coerce_data_id_or_uri_to_project_data_obj(
            uri
        )
        file_size = project_data_obj.data.details.file_size_in_bytes
    else:
        raise ValueError(f"Expected scheme to be one of s3 or icav2, got {uri_obj.scheme}")

    return file_size


def handler(event, context):
    """
    Get inputs,
    use the inputs to determine which validation to perform,
    perform the validation and return the result
    Raise an error if the validation fails

    Parameters
    ----------
    event
    context

    Returns
    -------

    """

    # Set icav2 env vars
    set_icav2_env_vars()

    # Get inputs
    file_size_in_bytes = event.get('fileSizeInBytes')
    output_uri = event.get('outputUri')
    destination_uri = event.get('destinationUri')
    source_data_uri = event.get('sourceDataUri')

    # Check first one
    if file_size_in_bytes is not None and output_uri is not None:
        # Get the file size
        file_size = get_filesize_from_uri(output_uri)

        # Validate the file size matches the input file size
        if not file_size == file_size_in_bytes:
            raise ValueError(
                f"File size of outputUri {file_size} does not match the "
                f"provided fileSizeInBytes {file_size_in_bytes}"
            )

    # Check second one
    elif destination_uri is not None and source_data_uri is not None:
        destination_data_uri = destination_uri + Path(urlparse(source_data_uri).path).name

        # This will raise an error if the file does not exist
        destination_data_size = get_filesize_from_uri(destination_data_uri)

        source_data_size = get_filesize_from_uri(source_data_uri)

        if not destination_data_size == source_data_size:
            raise ValueError(
                f"File size of destinationUri {destination_uri} ({destination_data_size}) does not match the "
                f"file size of sourceDataUri {source_data_uri} ({source_data_size})"
            )

    else:
        raise ValueError(
            "Invalid inputs. Must provide either fileSizeInBytes and outputUri, or destinationUri and sourceDataUri."
        )
