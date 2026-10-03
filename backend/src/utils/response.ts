import type { APIGatewayProxyResult } from 'aws-lambda';

export function successResponse(data: unknown, statusCode = 200): APIGatewayProxyResult {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(data) };
}

export function errorResponse(statusCode: number, message: string): APIGatewayProxyResult {
  return successResponse({ message }, statusCode);
}
