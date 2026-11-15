/** Swagger: VerifyEmailRequest. Javob: 204. */
export interface VerifyEmailRequest {
  code: string;
}

/** Swagger: ResendEmailVerificationResponse */
export interface ResendEmailVerificationResponse {
  codeExpiresAt: string;
  resendAvailableAt: string;
}
