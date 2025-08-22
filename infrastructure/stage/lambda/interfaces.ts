/* Lambda interfaces */
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export type LambdaName =
  | 'findSinglePartFiles'
  | 'convertSourceUriFolderToUriList'
  | 'generateCopyJobList'
  | 'launchIcav2Copy'
  | 'checkJobStatus'
  | 'uploadSinglePartFile'
  | 'getSourceFileSize';

/* Lambda names array */
/* Bit of double handling, BUT types are not parsed to JS */
export const lambdaNameList: LambdaName[] = [
  'findSinglePartFiles',
  'convertSourceUriFolderToUriList',
  'generateCopyJobList',
  'launchIcav2Copy',
  'checkJobStatus',
  'uploadSinglePartFile',
  'getSourceFileSize',
];

/* We also throw in our custom application interfaces here too */
export interface LambdaRequirementProps {
  needsIcav2AccessToken: boolean;
}

export type LambdaToRequirementsMapType = { [key in LambdaName]: LambdaRequirementProps };

export const lambdaToRequirementsMap: LambdaToRequirementsMapType = {
  findSinglePartFiles: {
    needsIcav2AccessToken: true,
  },
  convertSourceUriFolderToUriList: {
    needsIcav2AccessToken: true,
  },
  generateCopyJobList: {
    needsIcav2AccessToken: true,
  },
  launchIcav2Copy: {
    needsIcav2AccessToken: true,
  },
  checkJobStatus: {
    needsIcav2AccessToken: true,
  },
  uploadSinglePartFile: {
    needsIcav2AccessToken: true,
  },
  getSourceFileSize: {
    needsIcav2AccessToken: true,
  },
};

export interface BuildLambdaProps {
  lambdaName: LambdaName;
}

export interface LambdaObject extends BuildLambdaProps {
  lambdaFunction: PythonFunction;
}
