import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { CognitoAccessTokenPayload } from "aws-jwt-verify/jwt-model";

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID!,
});

export type JwtPayload = CognitoAccessTokenPayload;

export async function verifyJwt(token: string): Promise<JwtPayload> {
  return verifier.verify(token);
}

