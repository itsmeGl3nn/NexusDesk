const localValue = process.env.IS_LOCAL ?? process.env.AWS_SAM_LOCAL;
if (localValue && !['true', 'false', '1', '0'].includes(localValue.toLowerCase())) {
  throw new Error('IS_LOCAL must be true or false');
}
const isLocal = localValue === undefined
  ? Boolean(process.env.AWS_ENDPOINT)
  : ['true', '1'].includes(localValue.toLowerCase());
const awsEndpoint = isLocal ? process.env.AWS_ENDPOINT || 'http://localhost:4566' : undefined;
if (awsEndpoint && !['http:', 'https:'].includes(new URL(awsEndpoint).protocol)) {
  throw new Error('AWS_ENDPOINT must be an HTTP URL');
}

export const config = Object.freeze({
  isLocal,
  awsEndpoint,
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  ticketsTable: process.env.TICKETS_TABLE || process.env.TABLE_NAME || 'Tickets',
  usersTable: process.env.USERS_TABLE || 'Users',
  callsTable: process.env.CALLS_TABLE || 'Calls',
  logsTable: process.env.LOGS_TABLE || 'Logs',
  tenantsTable: process.env.TENANTS_TABLE || 'Tenants',
  cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID || '',
  cognitoClientId: process.env.COGNITO_CLIENT_ID || '',
});
