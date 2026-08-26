
"""
Given a source uri list and a destination uri, deconstruct into the following.

{
  "sourceDataList": [
    {"projectId": "prj.1234", "dataId": "fil.123456"},
    {"projectId": "prj.1234", "dataId": "fol.123456"}
  ],
  "destinationData": {
    "projectId": "prj.1234",
    "dataId": "fol.123456"
  },
  "externalSourceDataUriList": [
    "s3://bucket/path/to/file"
  ]
}

The source uri may be a file or a directory, the destination uri must be a directory.

Each source uri is coerced to a project data object and added to the sourceDataList. Any source uri that cannot be
resolved to a project data object (e.g. an external / non-ICAv2 uri) is collected into the externalSourceDataUriList.
"""

# Standard imports
from typing import List, Dict, Union
import logging
from fastapi.encoders import jsonable_encoder

# Layer imports
from icav2_tools import set_icav2_env_vars

# Wrapica imports
from wrapica.project_data import (
    coerce_data_id_or_uri_to_project_data_obj,
)

# Set logging
logging.basicConfig()
logger = logging.getLogger()
logger.setLevel(level=logging.INFO)


def handler(event, context) -> Dict[str, List[Dict[str, Union[str, List[str]]]]]:
    """
    Generate the copy objects
    :param event:
    :param context:
    :return:
    """
    # Set env vars
    set_icav2_env_vars()

    # Get inputs
    source_uri_list: List[str] = event["sourceUriList"]
    destination_uri: str = event["destinationUri"]

    # Check destination uri endswith "/"
    if not destination_uri.endswith("/"):
        raise ValueError("Destination uri must end with a '/'")

    # Coerce the source and destination uris to project data objects
    source_list: List[Dict[str, str]] = []
    parent_destination_project_data_obj = coerce_data_id_or_uri_to_project_data_obj(
        destination_uri,
        create_data_if_not_found=True
    )
    external_source_data_uri_list = []

    for source_uri_iter_ in source_uri_list:
        try:
            source_project_data_obj = coerce_data_id_or_uri_to_project_data_obj(source_uri_iter_)
        except (NotADirectoryError, FileNotFoundError, StopIteration) as e:
            external_source_data_uri_list.append(source_uri_iter_)
            continue

        source_list.append(
            {
                "projectId": str(source_project_data_obj.project_id),
                "dataId": str(source_project_data_obj.data.id),
            }
        )

    return jsonable_encoder({
        "sourceDataList": source_list,
        "destinationData": {
            "projectId": parent_destination_project_data_obj.project_id,
            "dataId": parent_destination_project_data_obj.data.id,
        },
        "externalSourceDataUriList": external_source_data_uri_list
    })
