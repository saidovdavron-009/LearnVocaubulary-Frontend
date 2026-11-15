export const environment = {
  production: false,
  /** Backend manzili. Development'da /api so'rovlari proxy.conf.json orqali shu manzilga yo'naltiriladi. */
  backendUrl: 'http://localhost:3000',
  /** HttpClient ishlatadigan prefiks (proxy tufayli nisbiy). */
  apiUrl: '/api',
};
