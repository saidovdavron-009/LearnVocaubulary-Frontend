import { UserRole } from '../../../../../core/api/enums';

/** Swagger: SignInRequest. login — email yoki username. */
export interface SignInRequest {
  login: string;
  password: string;
}

/** Swagger: SignInResponse */
export interface SignInResponse {
  userId: string;
  username: string;
  role: UserRole;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}
