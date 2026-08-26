/* Lambda interfaces */
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { IQueue } from 'aws-cdk-lib/aws-sqs';
import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { SfnName } from '../step-functions/interfaces';

export type LambdaName =
  // Send internal task token lambdas
  | 'checkJobStatus'
  // Handle Copy Jobs lambdas
  | 'generateCopyJobList'
  | 'getExternalSourceFileMetadata'
  | 'getRenamingMapParams'
  | 'launchIcav2Copy'
  | 'renameFile'
  | 'unlockCallbackId'
  | 'uploadFromFilemanager'
  | 'validateFileTransfer'
  | 'validateFolderTransfer'
  // Non SFN Lambdas
  | 'throttleCopyJobs';

/* Lambda names array */
/* Bit of double handling, BUT types are not parsed to JS */
export const lambdaNameList: LambdaName[] = [
  // Send internal task token lambdas
  'checkJobStatus',
  // Handle Copy Jobs lambdas
  'generateCopyJobList',
  'getExternalSourceFileMetadata',
  'getRenamingMapParams',
  'launchIcav2Copy',
  'renameFile',
  'unlockCallbackId',
  'uploadFromFilemanager',
  'validateFileTransfer',
  'validateFolderTransfer',
  // Non SFN Lambdas
  'throttleCopyJobs',
];

/* We also throw in our custom application interfaces here too */
export interface LambdaRequirementProps {
  needsIcav2Tools?: boolean;
  needsOrcabusApiTools?: boolean;
  needsCallbackPermissions?: boolean;
  needsSqsEventSource?: boolean;
  needsDurableExecutionPermissions?: boolean;
  needsDbPermissions?: boolean;
  needsSfnExecutablePermissions?: boolean;
}

export type LambdaToRequirementsMapType = { [key in LambdaName]: LambdaRequirementProps };

export const lambdaToRequirementsMap: LambdaToRequirementsMapType = {
  // Send internal task token lambdas
  checkJobStatus: {
    needsIcav2Tools: true,
  },
  // Handle Copy Jobs lambdas
  generateCopyJobList: {
    needsIcav2Tools: true,
  },
  getExternalSourceFileMetadata: {
    needsIcav2Tools: true,
    needsOrcabusApiTools: true,
  },
  getRenamingMapParams: {
    needsIcav2Tools: true,
  },
  launchIcav2Copy: {
    needsIcav2Tools: true,
  },
  renameFile: {
    needsIcav2Tools: true,
  },
  unlockCallbackId: {
    needsCallbackPermissions: true,
  },
  uploadFromFilemanager: {
    needsIcav2Tools: true,
    needsOrcabusApiTools: true,
  },
  validateFileTransfer: {
    needsIcav2Tools: true,
    needsOrcabusApiTools: true,
  },
  validateFolderTransfer: {
    needsIcav2Tools: true,
  },
  // Non SFN Lambdas
  throttleCopyJobs: {
    needsSqsEventSource: true,
    needsDurableExecutionPermissions: true,
    needsDbPermissions: true,
  },
};

export interface BuildLambdasProps {
  /* Sqs stuff */
  copyJobQueue: IQueue;

  /* Table stuff */
  tableObj: ITableV2;

  /* Sfn stuff */
  handleCopyJobSfnName: Extract<SfnName, 'handleCopyJobs'>;
}

export interface BuildLambdaProps extends BuildLambdasProps {
  lambdaName: LambdaName;
}

export interface LambdaObject {
  lambdaName: LambdaName;
  lambdaFunction: PythonFunction;
}
