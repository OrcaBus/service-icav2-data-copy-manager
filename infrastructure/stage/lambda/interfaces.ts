/* Lambda interfaces */
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export type LambdaNameList =
  | 'findSinglePartFiles'
  | 'convertSourceUriFolderToUriList'
  | 'generateCopyJobList'
  | 'launchIcav2Copy'
  | 'checkJobStatus';

/* Lambda names array */
/* Bit of double handling, BUT types are not parsed to JS */
export const lambdaNameList: Array<LambdaNameList> = [
  'findSinglePartFiles',
  'convertSourceUriFolderToUriList',
  'generateCopyJobList',
  'launchIcav2Copy',
  'checkJobStatus',
];

/* We also throw in our custom application interfaces here too */
export interface LambdaRequirementProps {
  needsIcav2AccessToken: boolean;
}

export type LambdaToRequirementsMapType = { [key in LambdaNameList]: LambdaRequirementProps };

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
};

export interface BuildLambdaProps {
  lambdaName: LambdaNameList;
}

export interface LambdaObject extends BuildLambdaProps {
  lambdaFunction: PythonFunction;
}
