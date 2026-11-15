/** Swagger: ResetPasswordRequest. Javob: 204. */
export interface ResetPasswordRequest {
  email: string;
  /** Emailga kelgan 6 xonali kod. */
  code: string;
  newPassword: string;
}

/** Swagger: ForgotPasswordRequest — kodni qayta yuborish uchun. */
export interface ResendResetCodeRequest {
  email: string;
}
