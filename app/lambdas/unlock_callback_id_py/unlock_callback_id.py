#!/usr/bin/env python3

"""
Unlock the callback id

Once we've generated the uri lists we can unlock the callback id and let another request from the queue come in.

https://docs.aws.amazon.com/lambda/latest/api/API_SendDurableExecutionCallbackSuccess.html

"""

# Standard library imports
import boto3
import typing

# Types
if typing.TYPE_CHECKING:
    from mypy_boto3_lambda.client import LambdaClient


def get_lambda_client() -> 'LambdaClient':
    return boto3.client('lambda')


def handler(event, context):
    """
    Given a library callback id, unlock it
    :param event:
    :param context:
    :return:
    """

    # Get the lambda client
    lambda_client = get_lambda_client()

    # Get the inputs
    callback_id = event['callbackId']

    # Callback id may be empty if this is the toplevel call
    if callback_id is None:
        return

    try:
        lambda_client.send_durable_execution_callback_success(
            CallbackId=event['callbackId'],
            Result="SUCCESS"
        )
    except lambda_client.exceptions.InvalidParameterValueException as e:
        raise ValueError(f"Invalid callback id: {event['callbackId']}") from e
