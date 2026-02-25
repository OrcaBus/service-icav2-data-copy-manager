#!/usr/bin/env python3

"""
Given the following inputs

* sourceUriList: The original input source uri list
* destinationUri: The original destination uri
* dataId: The dataId of the original file
* outputFileName: The name of the output file to be uploaded to the destinationUri

Get the following outputs:
* projectId: The projectId of the destinationUri
* inputDataId: The dataId of the copied file
* outputDataUri: The full destination uri for the moved file
* fileSizeInBytes: The file size in bytes for the copied file.

Find the relative path from the sourceUriList and the dataId and then append that relative path to the destinationUri
This gives us the full destination path for the copied file, we can also replace the basename with the outputFileName to get the final destination path
"""

# Standard imports
from typing import List
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from fastapi.encoders import jsonable_encoder

# Layer imports
from icav2_tools import set_icav2_env_vars

# Wrapica imports
from wrapica.data import get_data_obj_from_data_id
from wrapica.project_data import (
    coerce_data_id_or_uri_to_project_data_obj,
    get_project_data_obj_from_project_id_and_path,
    convert_project_data_obj_to_uri
)


def handler(event, context):
    """
    Get the inputs, find the relative path from the sourceUriList and the dataId and then append that relative path to the destinationUri
    :param event:
    :param context:
    :return:
    """

    # Set the icav2 env vars
    set_icav2_env_vars()

    # Get the inputs
    source_uri_list: List[str] = event['sourceUriList']
    external_source_uri_list: List[str] = event['externalSourceUriList']
    destination_uri: str = event['destinationUri']
    data_id: str = event.get('dataId')
    input_file_uri: str = event.get('inputFileUri')
    output_file_name: str = event['outputFileName']

    # Check output file name to ensure it does not have any path components
    if not str(Path(output_file_name)) == output_file_name:
        raise ValueError("outputFileName must not contain any path components.")

    # Ensure at least one of dataId or inputFileUri is provided
    if data_id is None and input_file_uri is None:
        raise ValueError("At least one of dataId or inputFileUri must be provided.")

    if external_source_uri_list is None:
        external_source_uri_list = []

    # Get the destination uri object
    destination_pd_obj = coerce_data_id_or_uri_to_project_data_obj(
        destination_uri
    )

    # Easy option first, if inputFileUri is not None AND is inside the externalSourceUriList,
    # then we can directly map to the destinationUri without worrying about relative paths
    # We don't need to check the external_source_uri_list for data ids since no external source uri will have data ids
    for external_source_uri_iter_ in external_source_uri_list:
        if input_file_uri is not None and input_file_uri.startswith(external_source_uri_iter_):
            destination_uri_obj = urlparse(destination_uri)
            output_data_uri = str(urlunparse((
                destination_uri_obj.scheme,
                destination_uri_obj.netloc,
                str(Path(destination_uri_obj.path) / output_file_name),
                None, None, None
            )))
            input_data_obj = get_project_data_obj_from_project_id_and_path(
                project_id=destination_pd_obj.project_id,
                data_path=Path(destination_pd_obj.data.details.path) / Path(input_file_uri).name,
                data_type="FILE"
            )
            return jsonable_encoder({
                "projectId": coerce_data_id_or_uri_to_project_data_obj(destination_uri).project_id,
                "inputDataId": input_data_obj.data.id,
                "outputDataUri": output_data_uri,
                "fileSizeInBytes": input_data_obj.data.details.file_size_in_bytes
            })

    # Now check for input file uris inside the source uri list
    for source_uri_iter_ in source_uri_list:
        if input_file_uri is not None and input_file_uri.startswith(source_uri_iter_):
            destination_uri_obj = urlparse(destination_uri)
            output_data_uri = str(urlunparse((
                destination_uri_obj.scheme,
                destination_uri_obj.netloc,
                str(Path(destination_uri_obj.path) / output_file_name),
                None, None, None
            )))
            input_data_obj = get_project_data_obj_from_project_id_and_path(
                project_id=destination_pd_obj.project_id,
                data_path=Path(destination_pd_obj.data.details.path) / Path(input_file_uri).name,
                data_type="FILE"
            )
            return jsonable_encoder({
                "projectId": coerce_data_id_or_uri_to_project_data_obj(destination_uri).project_id,
                "inputDataId": input_data_obj.data.id,
                "outputDataUri": output_data_uri,
                "fileSizeInBytes": input_data_obj.data.details.file_size_in_bytes
            })

    # From here on in, we expect that the dataId option is provided
    # Since the inputFileUri is not in the sourceUriList or externalSourceUriList
    if data_id is None:
        raise ValueError("dataId must be provided if inputFileUri is not in sourceUriList or externalSourceUriList.")

    # Get the source object
    source_obj = get_data_obj_from_data_id(
        data_id=data_id
    )

    # Given the source object, iterate over each of the source uris and find the relative path
    for source_uri_iter_ in source_uri_list:
        source_uri_iter_obj = coerce_data_id_or_uri_to_project_data_obj(
            source_uri_iter_
        )
        # Different approach between files and folders
        if source_uri_iter_obj.data.details.data_type == "FILE":
            # FILE - do the files match?
            if (
                source_obj.id == source_uri_iter_obj.data.id
            ):
                input_data_obj = get_project_data_obj_from_project_id_and_path(
                    project_id=destination_pd_obj.project_id,
                    data_path=Path(destination_pd_obj.data.details.path) / source_obj.details.name,
                    data_type="FILE"
                )
                return jsonable_encoder({
                    "projectId": destination_pd_obj.project_id,
                    "inputDataId": input_data_obj.data.id,
                    "outputDataUri": convert_project_data_obj_to_uri(destination_pd_obj, uri_type='icav2') + output_file_name,
                    "fileSizeInBytes": source_obj.details.file_size_in_bytes
                })
        else:
            # FOLDER - is the source object in the folder?
            if (
                    source_obj.details.owning_project_id == source_uri_iter_obj.project_id and
                    Path(source_obj.details.path).is_relative_to(source_uri_iter_obj.data.details.path)
            ):
                # Get the relative path of the source object to the source uri iter object
                relative_path = Path(source_obj.details.path).relative_to(source_uri_iter_obj.data.details.path)
                # Then we get the copied source object from the destination uri path, plus the relative path
                copied_source_obj = get_project_data_obj_from_project_id_and_path(
                    project_id=destination_pd_obj.project_id,
                    data_path=Path(destination_pd_obj.data.details.path) / Path(source_obj.details.path).name / relative_path,
                    data_type="FOLDER"
                )
                # Then we need to make a renaming
                output_data_uri = str(Path(destination_uri) / relative_path / output_file_name)

                return jsonable_encoder({
                    "projectId": source_obj.details.owning_project_id,
                    "inputDataId": copied_source_obj.data.id,
                    "outputDataUri": output_data_uri,
                    "fileSizeInBytes": source_obj.details.size_in_bytes
                })
