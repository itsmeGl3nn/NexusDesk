import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CognitoIdentityProviderServiceException } from "@aws-sdk/client-cognito-identity-provider";
import * as tenantService from "./tenant.service";
import type { RegisterTenantInput } from "./tenant.types";

function json(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function getRawBody(event: APIGatewayProxyEvent): string | undefined {
  if (!event.body) return undefined;
  return event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf-8")
    : event.body;
}

/** POST /tenants/register — public; provisions tenant + initial admin user */
export async function registerTenant(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const raw = getRawBody(event);
  if (!raw) return json(400, { message: "Request body is required" });

  let input: RegisterTenantInput;
  try {
    input = JSON.parse(raw) as RegisterTenantInput;
  } catch {
    return json(400, { message: "Invalid JSON body" });
  }

  const { tenantName, adminEmail, adminPassword, adminFirstName, adminLastName } = input;
  if (!tenantName || !adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
    return json(400, {
      message:
        "tenantName, adminEmail, adminPassword, adminFirstName, and adminLastName are required",
    });
  }

  try {
    const result = await tenantService.registerTenant(input);
    return json(201, result);
  } catch (err) {
    if (err instanceof CognitoIdentityProviderServiceException) {
      const safe: Record<string, string> = {
        UsernameExistsException: "An account with this email already exists.",
        InvalidPasswordException: "Password does not meet complexity requirements.",
        InvalidParameterException: "Invalid registration parameters.",
      };
      return json(400, { message: safe[err.name] ?? "Tenant registration failed" });
    }
    if (err instanceof Error && err.name === "ConditionalCheckFailedException") {
      return json(409, { message: "Tenant already exists" });
    }
    throw err;
  }
}
