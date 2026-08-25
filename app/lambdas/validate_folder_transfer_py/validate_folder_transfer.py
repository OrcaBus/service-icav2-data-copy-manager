#!/usr/bin/env python3

"""
Recursively validate that a copied folder matches its source.

Inputs:
- destinationUri: The parent destination folder uri (ends with '/')
- sourceDataProjectId: The project id of the source folder
- sourceDataId: The data id of the source folder (prefixed with 'fol.')

The destination folder is the destinationUri extended with the source folder name.

We recursively list all files beneath both the source folder and the destination folder and
validate that they contain the same number of files and the same total file size.

Empty source folders are ignored (they do not need a matching destination folder), since an
empty folder is never copied across.
"""

# Standard imports
from typing import List, Tuple

# Wrapica imports
from wrapica.libica_models import ProjectData
from wrapica.project_data import (
    coerce_data_id_or_uri_to_project_data_obj,
    get_project_data_obj_by_id,
    find_project_data_bulk,
)
from wrapica.utils.globals import FILE_DATA_TYPE

# Layer imports
from icav2_tools import set_icav2_env_vars


def list_files_recursively(project_data_obj: ProjectData) -> List[ProjectData]:
    """
    Given a folder project data object, recursively list all files (not folders) beneath it.
    """
    return find_project_data_bulk(
        project_id=project_data_obj.project_id,
        parent_folder_id=project_data_obj.data.id,
        data_type=FILE_DATA_TYPE,
    )


def get_file_count_and_total_size(file_list: List[ProjectData]) -> Tuple[int, int]:
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


def handler(event, context):
    """
    Recursively validate that the destination folder contains the same number of files and the same
    total file size as the source folder.

    The destination folder is the destinationUri extended with the source folder name.
    """
    # Set icav2 env vars
    set_icav2_env_vars()

    # Get inputs
    destination_uri: str = event['destinationUri']
    source_data_project_id: str = event['sourceDataProjectId']
    source_data_id: str = event['sourceDataId']

    source_folder_obj = get_project_data_obj_by_id(
        project_id=source_data_project_id,
        data_id=source_data_id,
    )

    source_files = list_files_recursively(source_folder_obj)
    source_file_count, source_total_size = get_file_count_and_total_size(source_files)

    # Ignore empty source folders - they are never copied across so there is no
    # destination folder to validate against.
    if source_file_count == 0:
        return

    # Destination folder is destinationUri + source folder name (destinationUri ends with '/')
    destination_folder_uri = destination_uri + source_folder_obj.data.details.name + "/"

    # This will raise if the destination folder does not exist
    destination_folder_obj = coerce_data_id_or_uri_to_project_data_obj(destination_folder_uri)

    destination_files = list_files_recursively(destination_folder_obj)
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
