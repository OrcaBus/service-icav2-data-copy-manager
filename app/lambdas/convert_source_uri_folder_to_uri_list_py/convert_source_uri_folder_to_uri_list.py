#!/usr/bin/env python3

"""
Given a sourceUri
Convert the source Uri into a list.

Inputs:
  * sourceUri: A icav2 folder in URI format

Outputs:
  * sourceUriList: A list of URIs, each representing a file or folder in the folder
"""

# Standard imports
from typing import List

# Layer imports
from icav2_tools import set_icav2_env_vars

# Wrapica imports
from wrapica.project_data import (
    coerce_data_id_or_uri_to_project_data_obj,
    ProjectData, list_project_data_non_recursively,
)


def get_files_and_folders_in_project_folder_non_recursively(project_data_folder: ProjectData) -> List[ProjectData]:
    """
    Given a project data folder, return a list of all files in the folder
    """

    # Get the file list
    data_list = list_project_data_non_recursively(
        project_id=project_data_folder.project_id,
        parent_folder_id=project_data_folder.data.id,
    )

    # Return the list of files (and this one)
    return data_list


def handler(event, context):
    # Set env vars
    set_icav2_env_vars()

    # Get the source URI from the event
    source_uri = event.get("sourceUri")

    # Get the source project data object from the source URI
    source_project_data_obj = coerce_data_id_or_uri_to_project_data_obj(source_uri)

    # Get the list of files and folders in the source project data object
    sub_folder_list = list_project_data_non_recursively(
        project_id=source_project_data_obj.project_id,
        parent_folder_id=source_project_data_obj.data.id,
    )

    return {
        "sourceUriList": list(map(
            lambda
                project_data_iter_: f"icav2://{project_data_iter_.project_id}{project_data_iter_.data.details.path}",
            sub_folder_list
        ))
    }
