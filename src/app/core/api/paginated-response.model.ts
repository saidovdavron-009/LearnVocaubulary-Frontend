/** Swagger: WebApiCorePaginatedResponseOf* */
export interface PaginatedResponse<T> {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  data: T[];
}

/** Sahifalangan endpointlarning majburiy query parametrlari. */
export interface PaginationParams {
  page: number;
  pageSize: number;
}
