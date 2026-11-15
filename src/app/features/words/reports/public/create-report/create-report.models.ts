import { ReportStatus } from '../../../../../core/api/enums';

/** Swagger: POST /api/words/{wordId}/reports → CreateReportRequest (10–2000 belgi). */
export interface CreateReportRequest {
  message: string;
}

/** Swagger: CreateReportResponse */
export interface CreateReportResponse {
  id: number;
  wordId: number;
  status: ReportStatus;
  createdAt: string;
}
