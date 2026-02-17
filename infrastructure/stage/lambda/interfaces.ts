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
  | 'uploadSinglePartFile';

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
];

/* We also throw in our custom application interfaces here too */
export interface LambdaRequirementProps {
  needsIcav2AccessToken?: boolean;
  needsOrcabusApiTools?: boolean;
}

export type LambdaToRequirementsMapType = { [key in LambdaName]: LambdaRequirementProps };

export const lambdaToRequirementsMap: LambdaToRequirementsMapType = {
  checkJobStatus: {
    needsIcav2AccessToken: true,
  },
  convertSourceUriFolderToUriList: {
    needsIcav2AccessToken: true,
  },
  findSinglePartFiles: {
    needsIcav2AccessToken: true,
  },
  generateCopyJobList: {
    needsIcav2AccessToken: true,
  },
  getExternalSourceFileMetadata: {
    needsIcav2AccessToken: true,
    needsOrcabusApiTools: true,
  },
  getRenamingMapParams: {
    needsIcav2AccessToken: true,
  },
  getSourceFileSize: {
    needsIcav2AccessToken: true,
  },
  launchIcav2Copy: {
    needsIcav2AccessToken: true,
  },
  renameFile: {
    needsIcav2AccessToken: true,
  },
  uploadFromFilemanager: {
    needsIcav2AccessToken: true,
    needsOrcabusApiTools: true,
  },
  uploadSinglePartFile: {
    needsIcav2AccessToken: true,
  },
};

export interface BuildLambdaProps {
  lambdaName: LambdaName;
}

export interface LambdaObject extends BuildLambdaProps {
  lambdaFunction: PythonFunction;
}
