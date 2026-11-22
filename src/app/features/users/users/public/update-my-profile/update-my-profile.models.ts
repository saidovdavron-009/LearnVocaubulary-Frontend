/** Swagger: PUT /api/profile/me → UpdateMyProfileRequest */
export interface UpdateMyProfileRequest {
  username: string;
  displayName?: string | null;
  /** https bilan boshlanadigan to'liq URL yoki yuklangan rasm manzili ("/api/uploads/images/{id}"). */
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

/** Swagger: POST /api/uploads/images → UploadImageResponse */
export interface UploadImageResponse {
  id: string;
  /** Nisbiy manzil: "/api/uploads/images/{id}" — avatar sifatida shu saqlanadi. */
  url: string;
}

/** Swagger: GET /api/languages → GetAllLanguagesResponse */
export interface ProfileLanguage {
  id: number;
  code: string;
  name: string;
  nativeName: string | null;
}
