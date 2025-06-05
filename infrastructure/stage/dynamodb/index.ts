import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { BuildTableProps } from './interfaces';

export function buildTable(scope: Construct, props: BuildTableProps) {
  /* Dynamodb table */
  return new dynamodb.TableV2(scope, props.tableName, {
    /* Either a db_uuid or an icav2 analysis id or a portal run id */
    partitionKey: {
      name: 'id',
      type: dynamodb.AttributeType.STRING,
    },
    /* One of 'job_type', 'task_token' */
    sortKey: {
      name: 'id_type',
      type: dynamodb.AttributeType.STRING,
    },
    tableName: props.tableName,
    removalPolicy: props.tableRemovalPolicy || RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
    pointInTimeRecoverySpecification: {
      pointInTimeRecoveryEnabled: true,
    },
    timeToLiveAttribute: 'expire_at',
  });
}
