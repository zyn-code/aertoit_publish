export const environment = {
  production: false,
  /** Express API. Same origin in production via a reverse proxy. */
  apiUrl: 'http://localhost:3000/api',
  siteUrl: 'http://localhost:4200',
  /** GA4 measurement ID. Only loaded after the visitor accepts statistics cookies. */
  gaMeasurementId: '',
};
