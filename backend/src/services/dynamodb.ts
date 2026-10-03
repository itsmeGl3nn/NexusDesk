import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { config } from '../utils/config';

export const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: config.region,
  ...(config.awsEndpoint ? {
    endpoint: config.awsEndpoint,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  } : {}),
}), { marshallOptions: { removeUndefinedValues: true } });
