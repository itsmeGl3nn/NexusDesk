import { CognitoJwtVerifier, JwtVerifier } from "aws-jwt-verify";
import { validateCognitoJwtFields } from "aws-jwt-verify/cognito-verifier";
import { SimpleJwksCache } from "aws-jwt-verify/jwk";
import type { CognitoAccessTokenPayload } from "aws-jwt-verify/jwt-model";
import { config } from "../../utils/config";

const userPoolId = config.cognitoUserPoolId;
const clientId = config.cognitoClientId;
const localIssuer = config.awsEndpoint
  ? `${config.awsEndpoint.replace(/\/$/, "")}/${userPoolId}`
  : undefined;

// Floci publishes signed Cognito tokens and JWKS at its configured base URL.
const verifier = localIssuer
  ? JwtVerifier.create({
      issuer: localIssuer,
      audience: null, // Cognito access tokens use client_id, checked below.
      customJwtCheck: ({ payload }) => validateCognitoJwtFields(payload, {
        tokenUse: "access",
        clientId,
      }),
    }, {
      jwksCache: new SimpleJwksCache({
        fetcher: {
          fetch: async (uri) => {
            const response = await fetch(uri, { signal: AbortSignal.timeout(3000) });
            if (!response.ok) throw new Error(`JWKS request failed (${response.status})`);
            return response.arrayBuffer();
          },
        },
      }),
    })
  : CognitoJwtVerifier.create({ userPoolId, tokenUse: "access", clientId });

export type JwtPayload = CognitoAccessTokenPayload;

export async function verifyJwt(token: string): Promise<JwtPayload> {
  return await verifier.verify(token) as JwtPayload;
}

