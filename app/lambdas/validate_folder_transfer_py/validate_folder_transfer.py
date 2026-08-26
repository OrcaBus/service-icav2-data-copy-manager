#!/usr/bin/env python3

"""
Recursively validate that a copied folder matches its source.

Inputs:
- destinationUri: The parent destination folder uri (ends with '/')
- sourceDataProjectId: The project id of the source folder
- sourceDataId: The data id of the source folder (prefixed with 'fol.')

The destination folder is the destinationUri extended with the source folder name.

We recursively list all files beneath both the source folder and the destination folder and
compare them file-by-file, keyed by their path relative to their respective folder roots.

A file is considered valid only if a file with the same relative path exists in the destination
and has the same file size in bytes. We report every file that is missing from the destination or
that has a mismatched file size, which makes it clear exactly which files failed to transfer.

Empty source folders are ignored (they do not need a matching destination folder), since an
empty folder is never copied across.
"""

# Standard imports
from typing import Dict, List

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


def get_relative_path_to_size_map(
        folder_obj: ProjectData,
        file_list: List[ProjectData],
) -> Dict[str, int]:
    """
    Given a folder project data object and the list of files beneath it, return a mapping of each
    file's path (relative to the folder root) to its file size in bytes.

    Keying on the relative path lets us line up source and destination files that live under
    different absolute paths.
    """
    folder_path = folder_obj.data.details.path

    relative_path_to_size_map: Dict[str, int] = {}
    for file_iter_ in file_list:
        file_path = file_iter_.data.details.path
        # Strip the folder prefix so source and destination files can be compared by relative path
        relative_path = file_path[len(folder_path):] if file_path.startswith(folder_path) else file_path
        relative_path_to_size_map[relative_path] = file_iter_.data.details.file_size_in_bytes or 0

    return relative_path_to_size_map


def handler(event, context):
    """
    Recursively validate that the destination folder contains the same files (by relative path and
    file size) as the source folder.

    The destination folder is the destinationUri extended with the source folder name.
    Raises a ValueError listing every missing or mismatched file if validation fails.
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

    # Ignore empty source folders - they are never copied across so there is no
    # destination folder to validate against.
    if len(source_files) == 0:
        return

    # Destination folder is destinationUri + source folder name (destinationUri ends with '/')
    destination_folder_uri = destination_uri + source_folder_obj.data.details.name + "/"

    # This will raise if the destination folder does not exist
    destination_folder_obj = coerce_data_id_or_uri_to_project_data_obj(destination_folder_uri)

    destination_files = list_files_recursively(destination_folder_obj)

    source_map = get_relative_path_to_size_map(source_folder_obj, source_files)
    destination_map = get_relative_path_to_size_map(destination_folder_obj, destination_files)

    # Compare each source file against its destination counterpart by relative path
    missing_files: List[str] = []
    mismatched_files: List[str] = []
    for relative_path, source_size in source_map.items():
        if relative_path not in destination_map:
            missing_files.append(relative_path)
        elif not destination_map[relative_path] == source_size:
            mismatched_files.append(
                f"{relative_path} (source {source_size} bytes, destination {destination_map[relative_path]} bytes)"
            )

    if len(missing_files) > 0 or len(mismatched_files) > 0:
        error_message_parts = [
            f"Validation of destination folder {destination_folder_uri} against source folder failed."
        ]
        if len(missing_files) > 0:
            error_message_parts.append(
                f"The following {len(missing_files)} file(s) are missing from the destination: "
                f"{', '.join(missing_files)}"
            )
        if len(mismatched_files) > 0:
            error_message_parts.append(
                f"The following {len(mismatched_files)} file(s) have mismatched file sizes: "
                f"{', '.join(mismatched_files)}"
            )
        raise ValueError(" ".join(error_message_parts))
