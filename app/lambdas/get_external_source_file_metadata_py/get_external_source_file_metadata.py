#!/usr/bin/env python3

"""
Given an externalSourceUri, get the filesize and determine if the file is a single part file or a multi part file
"""

# Standard imports
import typing

# API imports
from orcabus_api_tools.filemanager import get_file_object_from_s3_uri

if typing.TYPE_CHECKING:
    from orcabus_api_tools.filemanager.models import FileObject

def handler(event, context):
    """
    Get the inputs, get the filesize and determine if the file is a single part file or a multi part file
    """

    # Get the external source uri
    external_source_uri = event['externalSourceUri']

    file_obj: 'FileObject' = get_file_object_from_s3_uri(external_source_uri)

    return {
        'sourceFileSizeInBytes': file_obj['size'],
        'isMultipartFile': (True if "-" in file_obj['eTag'] else False)
    }
