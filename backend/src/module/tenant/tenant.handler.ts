import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CognitoIdentityProviderServiceException } from "@aws-sdk/client-cognito-identity-provider";
import * as tenantService from "./tenant.service";
import { parseRegisterTenantInput, ValidationError } from "./tenant.schema";
import { successResponse, errorResponse } from "../../utils/response";
import { logger } from "../../utils/logger";

/** Public registration provisions a new tenant and its first administrator. */
export async function registerTenant(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) return errorResponse(400, "Request body is required");
  let parsed: unknown;
  try {
    parsed = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
  } catch { return errorResponse(400, "Invalid JSON body"); }
  try {
    return successResponse(await tenantService.registerTenant(parseRegisterTenantInput(parsed)), 201);
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(400, error.message);
    if (error instanceof CognitoIdentityProviderServiceException) {
      const messages: Record<string, string> = {
        UsernameExistsException: "An account with this email already exists.",
        InvalidPasswordException: "Password does not meet complexity requirements.",
        InvalidParameterException: "Invalid registration parameters.",
      };
      return errorResponse(400, messages[error.name] ?? "Tenant registration failed");
    }
    logger.error("Tenant registration failed", { error: error instanceof Error ? error.name : "UnknownError" });
    return errorResponse(500, "Tenant registration failed");
  }
}

