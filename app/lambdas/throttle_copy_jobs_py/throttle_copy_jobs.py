#!/usr/bin/env python3

"""
Throttle the copy jobs from an SQS queue URL

SQS queue forwards the request onto here and we don't return until the copy job step is resolved in the step function we launch.

This way we can throttle through the requests to prevent overload of the ICAv2 API

We take in one request per lambda and run a maximum of 15 lambdas simultaneously.

Once the request comes back we delete the queue from the database too

"""


# Standard library imports
import json
from os import environ
import boto3
import typing
from typing import Dict, Any

# Durable context imports
from aws_durable_execution_sdk_python import (
    DurableContext,
    durable_execution
)
from aws_durable_execution_sdk_python.config import (
    Duration, WaitForCallbackConfig
)

from aws_durable_execution_sdk_python.retries import create_retry_strategy
from aws_durable_execution_sdk_python.types import WaitForCallbackContext

if typing.TYPE_CHECKING:
    from mypy_boto3_stepfunctions.client import SFNClient
    from mypy_boto3_dynamodb.client import DynamoDBClient

# Globals
DATABASE_NAME_ENV_VAR = "DATABASE_NAME"
HANDLE_COPY_JOB_SFN_ARN_ENV_VAR = "HANDLE_COPY_JOB_SFN_ARN"


def get_dynamodb_client() -> 'DynamoDBClient':
    return boto3.client('dynamodb')


def get_sfn_client() -> 'SFNClient':
    return boto3.client('stepfunctions')


def run_execution(sfn_input: Dict[str, Any], context: DurableContext) -> None:
    # Define the wrapper function
    def submitter(callback_id: str, callback_context: WaitForCallbackContext):
        callback_context.logger.info("Submitting copy job")
        # Step 2: Launch the copy job (asynchronously)
        sfn_object = get_sfn_client().start_execution(
            stateMachineArn=environ[HANDLE_COPY_JOB_SFN_ARN_ENV_VAR],
            input=json.dumps({
                **sfn_input,
                "callbackId": callback_id,
            }),
        )
        callback_context.logger.info(f"Submitting copy job as {sfn_object['executionArn']}")

    # Step 3: Wait here for the callback to be invoked
    context.wait_for_callback(
        submitter=submitter,
        name=None,
        config=WaitForCallbackConfig(
            timeout=Duration.from_minutes(15),
            retry_strategy=create_retry_strategy(
                config=None
            )
        ),
    )

@durable_execution
def handler(event, context: DurableContext):
    """
    Expect the following inputs from the event object:
      * inputs
      * engineParameters
      * tags

    :param event:
    :param context:
    :return:
    """

    # Not sure what this will look like from the sqs event source
    for record in event.get("Records", []):
        record_body = json.loads(record.get("body", {}))
        # Check if the event contains the required keys
        required_keys = ['payload']
        for key in required_keys:
            if key not in record_body:
                raise ValueError(f"Missing required key: {key}")

        # Run the durable execution callback configuration
        run_execution(record_body, context)

        # Step 2: Delete the item from DynamoDb database
        if 'taskToken' in record_body.keys() and record_body['taskToken'] is not None:
            try:
                get_dynamodb_client().delete_item(
                    Key={
                        "id": {
                            "S": record_body['taskToken'],
                        },
                        "id_type": {
                            "S": "TASK_TOKEN_SQS"
                        }
                    },
                    TableName=environ[DATABASE_NAME_ENV_VAR]
                )
            # This will get cleaned up later if we cant delete it now for some reason
            except Exception as e:
                continue
