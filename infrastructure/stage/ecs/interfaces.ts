/*
Interfaces
*/

import { IParameter } from 'aws-cdk-lib/aws-ssm';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { EcsFargateTaskConstruct } from '@orcabus/platform-cdk-constructs/ecs';

export type EcsTaskName = 'renameFile' | 'uploadFromFilemanager' | 'uploadSinglePartFile';

export const ecsTaskNameList: EcsTaskName[] = [
  'renameFile',
  'uploadFromFilemanager',
  'uploadSinglePartFile',
];

export interface BuildAllFargateEcsTasksProps {
  icav2AccessTokenSecretObj: ISecret;
  orcabusTokenSecretObj: ISecret;
  hostnameSsmParameter: IParameter;
}

export interface BuildFargateEcsTaskProps extends BuildAllFargateEcsTasksProps {
  taskName: EcsTaskName;
}

export interface EcsTaskObject {
  taskName: EcsTaskName;
  ecsFargateTaskConstruct: EcsFargateTaskConstruct;
}
