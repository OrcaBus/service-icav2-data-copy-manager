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

If given destinationUri and a folder sourceDataId / sourceDataProjectId,
The destinationUri provided is a folder, extend with the source folder name and recursively validate that the
destination folder contains the same number of files and the same total file size as the source folder.
"""
# Standard imports
from pathlib import Path
from typing import List
from urllib.parse import urlparse

# Wrapica imports
from wrapica.libica_models import ProjectData
from wrapica.project_data import (
    coerce_data_id_or_uri_to_project_data_obj,
    get_project_data_obj_by_id,
    convert_project_data_obj_to_uri,
    find_project_data_recursively,
)
from wrapica.utils.globals import FILE_DATA_TYPE

# Orcabus layer imports
from orcabus_api_tools.filemanager import get_file_object_from_s3_uri
from icav2_tools import set_icav2_env_vars


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


def list_files_recursively(project_data_obj: ProjectData) -> List[ProjectData]:
    """
    Given a folder project data object, recursively list all files (not folders) beneath it.
    """
    return find_project_data_recursively(
        project_id=project_data_obj.project_id,
        parent_folder_id=project_data_obj.data.id,
        data_type=FILE_DATA_TYPE,
    )


def get_file_count_and_total_size(file_list: List[ProjectData]) -> (int, int):
    """
    Given a list of file project data objects, return the number of files and the total file size in bytes.
    """
    total_size = sum(
        map(
            lambda file_iter_: (file_iter_.data.details.file_size_in_bytes or 0),
            file_list
        )
    )
    return len(file_list), total_size


def validate_folder(destination_uri: str, source_data_project_id: str, source_data_id: str):
    """
    Recursively validate that the destination folder contains the same number of files and the same
    total file size as the source folder.

    The destination folder is the destination_uri extended with the source folder name.
    """
    source_folder_obj = get_project_data_obj_by_id(
        project_id=source_data_project_id,
        data_id=source_data_id,
    )

    # Destination folder is destinationUri + source folder name (destinationUri ends with '/')
    destination_folder_uri = destination_uri + source_folder_obj.data.details.name + "/"

    # This will raise if the destination folder does not exist
    destination_folder_obj = coerce_data_id_or_uri_to_project_data_obj(destination_folder_uri)

    source_files = list_files_recursively(source_folder_obj)
    destination_files = list_files_recursively(destination_folder_obj)

    source_file_count, source_total_size = get_file_count_and_total_size(source_files)
    destination_file_count, destination_total_size = get_file_count_and_total_size(destination_files)

    if not source_file_count == destination_file_count:
        raise ValueError(
            f"File count of destination folder {destination_folder_uri} ({destination_file_count}) does not match the "
            f"file count of source folder ({source_file_count})"
        )

    if not source_total_size == destination_total_size:
        raise ValueError(
            f"Total file size of destination folder {destination_folder_uri} ({destination_total_size}) does not match "
            f"the total file size of source folder ({source_total_size})"
        )


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

    source_data_id = event.get('sourceDataId')
    source_data_project_id = event.get('sourceDataProjectId')
    source_data_uri = event.get('sourceDataUri')

    # A folder source data id is prefixed with 'fol.', a file source data id is prefixed with 'fil.'
    is_folder = source_data_id is not None and source_data_id.startswith('fol')

    # Folder validation
    if destination_uri is not None and source_data_id is not None and source_data_project_id is not None and is_folder:
        validate_folder(
            destination_uri=destination_uri,
            source_data_project_id=source_data_project_id,
            source_data_id=source_data_id,
        )
        return

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
                f"File size of destinationUri {destination_data_uri} ({destination_data_size}) does not match the "
                f"file size of sourceDataUri {source_data_uri} ({source_data_size})"
            )

    # Third one
    elif destination_uri is not None and source_data_id is not None and source_data_project_id is not None:
        source_data_object = get_project_data_obj_by_id(
            project_id=source_data_project_id,
            data_id=source_data_id,
        )

        source_data_uri = convert_project_data_obj_to_uri(
            source_data_object
        )

        destination_data_uri = destination_uri + Path(urlparse(source_data_uri).path).name

        # This will raise an error if the file does not exist
        destination_data_size = get_filesize_from_uri(destination_data_uri)
        source_data_size = source_data_object.data.details.file_size_in_bytes

        if not destination_data_size == source_data_size:
            raise ValueError(
                f"File size of destinationUri {destination_data_uri} ({destination_data_size}) does not match the "
                f"file size of sourceDataUri {source_data_uri} ({source_data_size})"
            )

    else:
        raise ValueError(
            "Invalid inputs. Must provide either fileSizeInBytes and outputUri, or destinationUri and sourceDataUri."
        )
