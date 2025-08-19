/*
Interfaces
*/

import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';

export interface BuildUploadSinglePartFileFargateEcsProps {
  icav2AccessTokenSecretObj: ISecret;
}
