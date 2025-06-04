import { RemovalPolicy } from 'aws-cdk-lib';

export interface BuildTableProps {
  tableName: string;
  tableRemovalPolicy?: RemovalPolicy;
}
