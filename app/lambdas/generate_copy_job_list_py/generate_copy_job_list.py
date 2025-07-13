#!/usr/bin/env python3

"""
Given a source uri list and a destination uri, deconstruct into the following.

{
  "sourceList": [ {"prj.1234", "fil.123456"}, {"fil.1234567", "fol.123456" ],
  "destinationId": "folder.123456",
  "recursiveCopyJobsList": [
    {
      "destinationId": "fol.123567",
      "sourceIdList": ["fil.123456", "fil.123457", "fol.56789"]
    }
  ]
}

The source uri may be a file or a directory, the destination uri must be a directory.

If any item in the sourceIdList is a folder, we list the folder non-recursively and add the files in that folder to an
item in the recursiveCopyJobsList.

Due to AWS S3 Object tagging bugs, it's important each folder is part of its own job so we can handle single-part files correctly.

"""

# Standard imports
from typing import List, Dict, Union
from pathlib import Path
import logging

# Layer imports
from icav2_tools import set_icav2_env_vars

# Wrapica imports
from wrapica.project_data import (
    coerce_data_id_or_uri_to_project_data_obj,
    ProjectData, list_project_data_non_recursively
)
from wrapica.enums import DataType

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
    # Set env vras
    set_icav2_env_vars()

    # Get inputs
    source_uri_list: List[str] = event["sourceUriList"]
    destination_uri: str = event["destinationUri"]

    # Check destination uri endswith "/"
    if not destination_uri.endswith("/"):
        raise ValueError("Destination uri must end with a '/'")

    # Coerce the source and destination uris to project data objects
    source_list: List[Dict[str, str]] = []
    recursive_copy_jobs_list: List[Dict[str, Union[str, List[str]]]] = []
    parent_destination_project_data_obj = coerce_data_id_or_uri_to_project_data_obj(
        destination_uri,
        create_data_if_not_found=True
    )

    for source_uri_iter_ in source_uri_list:
        source_project_data_obj = coerce_data_id_or_uri_to_project_data_obj(source_uri_iter_)

        # Check if the source uri is a file or a folder
        if DataType(source_project_data_obj.data.details.data_type) == DataType.FILE:
            # Easy, simple case
            source_list.append(
                {
                    "projectId": source_project_data_obj.project_id,
                    "dataId": source_project_data_obj.data.id
                }
            )
            continue

        recursive_copy_jobs_list.append(
            {
                "destinationUri": f"icav2://{parent_destination_project_data_obj.project_id}{Path(parent_destination_project_data_obj.data.details.path) / source_project_data_obj.data.details.name}/",
                "sourceUri": f"icav2://{source_project_data_obj.project_id}{source_project_data_obj.data.details.path}"
            }
        )

    return {
        "sourceDataList": source_list,
        "destinationData": {
            "projectId": parent_destination_project_data_obj.project_id,
            "dataId": parent_destination_project_data_obj.data.id
        },
        "recursiveCopyJobsUriList": recursive_copy_jobs_list
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
#                 "sourceUriList": [
#                     "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-analyses/Tsqn250707-Dawson-Tothill_10Jul25_91da19_17d664-5f9ba83d-719a-44de-98b4-3f4c87d86615/output/Samples/",
#                     "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-analyses/Tsqn250707-Dawson-Tothill_10Jul25_91da19_17d664-5f9ba83d-719a-44de-98b4-3f4c87d86615/output/Reports/"
#                 ],
#                 "destinationUri": "icav2://eba5c946-1677-441d-bbce-6a11baadecbb/primary/250710_A01052_0268_BHFK3GDSXF/202507115171ae40/"
#             },
#             None)
#         , indent=4
#     ))
#
#     # {
#     #     "sourceDataList": [],
#     #     "destinationData": {
#     #         "projectId": "eba5c946-1677-441d-bbce-6a11baadecbb",
#     #         "dataId": "fol.0212cbccf50d4c37803c08ddbfe6c43d"
#     #     },
#     #     "recursiveCopyJobsUriList": [
#     #         {
#     #             "destinationUri": "icav2://eba5c946-1677-441d-bbce-6a11baadecbb/primary/250710_A01052_0268_BHFK3GDSXF/202507115171ae40/Samples/",
#     #             "sourceUri": "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-analyses/Tsqn250707-Dawson-Tothill_10Jul25_91da19_17d664-5f9ba83d-719a-44de-98b4-3f4c87d86615/output/Samples/"
#     #         },
#     #         {
#     #             "destinationUri": "icav2://eba5c946-1677-441d-bbce-6a11baadecbb/primary/250710_A01052_0268_BHFK3GDSXF/202507115171ae40/Reports/",
#     #             "sourceUri": "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-analyses/Tsqn250707-Dawson-Tothill_10Jul25_91da19_17d664-5f9ba83d-719a-44de-98b4-3f4c87d86615/output/Reports/"
#     #         }
#     #     ]
#     # }

# if __name__ == "__main__":
#     from os import environ
#     import json
#
#     environ['AWS_PROFILE'] = 'umccr-production'
#     environ['AWS_REGION'] = 'ap-southeast-2'
#     environ["ICAV2_ACCESS_TOKEN_SECRET_ID"] = "ICAv2JWTKey-umccr-prod-service-production"
#
#     print(json.dumps(
#         handler({
#             "sourceUriList": [
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/ExtractionMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/EmpiricalPhasingMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/SummaryRunMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/ExtendedTileMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/CorrectedIntMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/ErrorMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/QMetrics2030Out.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/QMetricsByLaneOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/TileMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/ImageMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/QMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/AlignmentMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/BasecallingMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/PFGridMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/OpticalModelMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/FWHMGridMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/EventMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-runs/250710_A01052_0268_BHFK3GDSXF_5290288/InterOp/RegistrationMetricsOut.bin",
#                 "icav2://9ec02c1f-53ba-47a5-854d-e6b53101adb7/ilmn-analyses/Tsqn250707-Dawson-Tothill_10Jul25_91da19_17d664-5f9ba83d-719a-44de-98b4-3f4c87d86615/output/Reports/IndexMetricsOut.bin"
#             ],
#             "destinationUri": "icav2://eba5c946-1677-441d-bbce-6a11baadecbb/primary/250710_A01052_0268_BHFK3GDSXF/202507115171ae40/InterOp/"
#         },
#             None),
#         indent=4
#     ))
#
#     # {
#     #     "sourceDataList": [
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.10f6702a1ae84c808f9c08ddbe7c5b66"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.432e7468ab314453bb0d08ddbbaa89f2"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.946ec123b4e44b04bb0f08ddbbaa89f2"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.c6bbd51e26164cb0a1d508ddbe7c5b66"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.a6db43c434994eceb42308ddbe7c5b66"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.6b64586869b34b9ce01908ddbbaa89f2"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.96d3809ffb974817e01a08ddbbaa89f2"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.78a2d85e7a4c407eb42508ddbe7c5b66"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.72cbd5f526684793b42408ddbe7c5b66"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.47331660845a43843bc708ddbfe311ed"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.f52b731759004666238308ddbfe46f5f"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.9f5c28747c364686238408ddbfe46f5f"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.7ba56c0468b14996238508ddbfe46f5f"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.52ff5364864645733bc808ddbfe311ed"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.a40fa0d707e64f39238808ddbfe46f5f"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.c8cd621235c447d9238a08ddbfe46f5f"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.4273aa579355417e3bca08ddbfe311ed"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.00e5bf752ea14c11238b08ddbfe46f5f"
#     #         },
#     #         {
#     #             "projectId": "9ec02c1f-53ba-47a5-854d-e6b53101adb7",
#     #             "dataId": "fil.e5dd0dbd66b74de32f1a08ddbfe46f5f"
#     #         }
#     #     ],
#     #     "destinationData": {
#     #         "projectId": "eba5c946-1677-441d-bbce-6a11baadecbb",
#     #         "dataId": "fol.601f8bd0830248986eec08ddbfe70afe"
#     #     },
#     #     "recursiveCopyJobsUriList": []
#     # }
