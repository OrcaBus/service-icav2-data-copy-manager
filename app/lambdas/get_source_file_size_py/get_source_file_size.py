#!/usr/bin/env python3

"""
Get the source file size
"""

# Wrapica imports
from wrapica.project_data import (
    get_project_data_obj_by_id,
)

# Layer imports
from icav2_tools import set_icav2_env_vars

def handler(event, context):
    """
    Given the inputs of
    :param event:
    :param context:
    :return:
    """
    # Set icav2 env vars
    set_icav2_env_vars()

    # Get inputs
    project_id = event.get("projectId")
    data_id = event.get("dataId")

    return {
        "fileSizeInBytes": get_project_data_obj_by_id(
            project_id=project_id,
            data_id=data_id
        ).data.details.file_size_in_bytes
    }
