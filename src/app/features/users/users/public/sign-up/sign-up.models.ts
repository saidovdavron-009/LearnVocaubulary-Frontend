import { UserRole } from '../../../../../core/api/enums';

/** Swagger: SignUpRequest */
export interface SignUpRequest {
  email: string;
  username: string;
  password: string;
  displayName?: string | null;
  nativeLanguageId?: number | null;
  timezone?: string | null;
}

/** Swagger: SignUpResponse */
export interface SignUpResponse {
  userId: string;
  email: string;
  username: string;
  role: UserRole;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}
