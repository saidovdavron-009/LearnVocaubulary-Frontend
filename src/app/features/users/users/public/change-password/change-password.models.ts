/** Swagger: PUT /api/profile/me/password → ChangePasswordRequest. 204, seans yopiladi. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Swagger: POST /api/profile/me/password → SetPasswordRequest (parolsiz, OAuth orqali kirgan hisob uchun). 204. */
export interface SetPasswordRequest {
  newPassword: string;
}
