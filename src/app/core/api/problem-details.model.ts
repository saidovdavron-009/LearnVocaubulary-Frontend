/** Swagger: FastEndpointsProblemDetails_Error */
export interface ProblemDetailsError {
  /** Xatoga sabab bo'lgan maydon nomi (masalan "login") yoki umumiy xato nomi. */
  name: string;
  reason: string;
  code?: string | null;
  severity?: string | null;
}

/** Swagger: FastEndpointsProblemDetails (RFC 9457) */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  instance: string;
  traceId: string;
  detail?: string | null;
  errors?: ProblemDetailsError[];
}
