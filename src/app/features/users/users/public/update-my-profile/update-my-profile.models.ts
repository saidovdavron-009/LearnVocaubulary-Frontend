/** Swagger: PUT /api/profile/me → UpdateMyProfileRequest */
export interface UpdateMyProfileRequest {
  username: string;
  displayName?: string | null;
  /** https bilan boshlanadigan to'liq URL. */
  avatarUrl?: string | null;
  nativeLanguageId?: number | null;
  timezone: string;
}

/** Swagger: UpdateMyProfileResponse */
export interface UpdateMyProfileResponse {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  nativeLanguageId: number | null;
  timezone: string | null;
}

/** Swagger: GET /api/languages → GetAllLanguagesResponse */
export interface ProfileLanguage {
  id: number;
  code: string;
  name: string;
  nativeName: string | null;
}
