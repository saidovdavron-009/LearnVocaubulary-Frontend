export const environment = {
  production: true,
  /** Production backend manzili (Render). */
  backendUrl: 'https://learnvocabulary-api.onrender.com',
  /**
   * Nisbiy prefiks: Render static site /api/* so'rovlarini backend'ga proksi qiladi (render.yaml'dagi rewrite).
   * Shu tufayli frontend va API bitta domenda — CORS kerak emas.
   */
  apiUrl: '/api',
};
