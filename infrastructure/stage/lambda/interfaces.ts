/* Lambda interfaces */
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export type LambdaName =
  | 'checkJobStatus'
  | 'convertSourceUriFolderToUriList'
  | 'findSinglePartFiles'
  | 'generateCopyJobList'
  | 'getExternalSourceFileMetadata'
  | 'getRenamingMapParams'
  | 'getSourceFileSize'
  | 'launchIcav2Copy'
  | 'renameFile'
  | 'uploadFromFilemanager'
  | 'uploadSinglePartFile'
  | 'validateFileTransfer';

/* Lambda names array */
/* Bit of double handling, BUT types are not parsed to JS */
export const lambdaNameList: LambdaName[] = [
  'checkJobStatus',
  'convertSourceUriFolderToUriList',
  'findSinglePartFiles',
  'generateCopyJobList',
  'getExternalSourceFileMetadata',
  'getRenamingMapParams',
  'getSourceFileSize',
  'launchIcav2Copy',
  'renameFile',
  'uploadFromFilemanager',
  'uploadSinglePartFile',
  'validateFileTransfer',
];

/* We also throw in our custom application interfaces here too */
export interface LambdaRequirementProps {
  needsIcav2Tools?: boolean;
  needsOrcabusApiTools?: boolean;
}

export type LambdaToRequirementsMapType = { [key in LambdaName]: LambdaRequirementProps };

export const lambdaToRequirementsMap: LambdaToRequirementsMapType = {
  checkJobStatus: {
    needsIcav2Tools: true,
  },
  convertSourceUriFolderToUriList: {
    needsIcav2Tools: true,
  },
  findSinglePartFiles: {
    needsIcav2Tools: true,
  },
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
  getSourceFileSize: {
    needsIcav2Tools: true,
  },
  launchIcav2Copy: {
    needsIcav2Tools: true,
  },
  renameFile: {
    needsIcav2Tools: true,
  },
  uploadFromFilemanager: {
    needsIcav2Tools: true,
    needsOrcabusApiTools: true,
  },
  uploadSinglePartFile: {
    needsIcav2Tools: true,
  },
  validateFileTransfer: {
    needsIcav2Tools: true,
    needsOrcabusApiTools: true,
  },
};

export interface BuildLambdaProps {
  lambdaName: LambdaName;
}

export interface LambdaObject extends BuildLambdaProps {
  lambdaFunction: PythonFunction;
}
