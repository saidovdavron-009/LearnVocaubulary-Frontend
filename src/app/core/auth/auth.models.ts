import { UserRole } from '../api/enums';

/**
 * Tizimga kirgan user seansi. Swagger: SignInResponse (public va admin) va
 * OAuthSignInResponse bilan bir xil maydonlar.
 */
export interface AuthSession {
  userId: string;
  username: string;
  role: UserRole;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

/** Swagger: RefreshTokenRequest */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** Swagger: RefreshTokenResponse */
export interface RefreshTokenResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}
