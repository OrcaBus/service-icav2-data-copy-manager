#!/usr/bin/env python3

"""
Given a list of icav2 project data objects (project id / data id),
find those that are uploaded as a single-part file (eTag does not contain a dash).
"""

# Standard imports
from typing import List, Dict
import re
import logging

# Layer imports
from icav2_tools import set_icav2_env_vars

# Wrapica imports
from wrapica.project_data import (
    get_project_data_obj_by_id
)

# Set logging
logging.basicConfig()
logger = logging.getLogger()
logger.setLevel(level=logging.INFO)


# Globals
MULTI_PART_ETAG_REGEX = re.compile(r"\w+-\d+")


def handler(event, context) -> Dict[str, List[Dict[str, str]]]:
    """
    Generate the copy objects
    :param event:
    :param context:
    :return:
    """
    set_icav2_env_vars()

    # Get inputs
    data_list: List[Dict[str, str]] = event["dataList"]

    single_part_files_list = []
    multi_part_files_list = []

    for source_data_dict in data_list:
        project_data_obj = get_project_data_obj_by_id(
            project_id=source_data_dict.get("projectId"),
            data_id=source_data_dict.get("dataId"),
        )

        if MULTI_PART_ETAG_REGEX.fullmatch(project_data_obj.data.details.object_e_tag) is not None:
            multi_part_files_list.append(source_data_dict)
        else:
            single_part_files_list.append(source_data_dict)


    return {
        "multiPartDataList": multi_part_files_list,
        "singlePartDataList": single_part_files_list,
    }


# if __name__ == "__main__":
#     from os import environ
#     import json
#
#     environ['AWS_PROFILE'] = 'umccr-production'
#     environ['AWS_REGION'] = 'ap-southeast-2'
#     environ["ICAV2_ACCESS_TOKEN_SECRET_ID"] = "ICAv2JWTKey-umccr-prod-service-production"
#
#     print(json.dumps(
#         handler(
#             {
#                 "dataList": [
#                     {
#                         "projectId": "eba5c946-1677-441d-bbce-6a11baadecbb",
#                         "dataId": "fil.be1b0cc74abe44c919a008dd6f300f84"
#                     },
#                     {
#                         "projectId": "eba5c946-1677-441d-bbce-6a11baadecbb",
#                         "dataId": "fil.d6a98abe0fed4185608d08dd6cb7632e"
#                     }
#                 ]
#             },
#             None)
#         , indent=4
#     ))
#
#     # {
#     #     "multiPartDataList": [],
#     #     "singlePartDataList": [
#     #         {
#     #             "projectId": "eba5c946-1677-441d-bbce-6a11baadecbb",
#     #             "dataId": "fil.be1b0cc74abe44c919a008dd6f300f84"
#     #         },
#     #         {
#     #             "projectId": "eba5c946-1677-441d-bbce-6a11baadecbb",
#     #             "dataId": "fil.d6a98abe0fed4185608d08dd6cb7632e"
#     #         }
#     #     ]
#     # }
