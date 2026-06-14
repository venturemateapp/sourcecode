export const API_CONFIG = {
  GRAPHQL_URL: import.meta.env.VITE_GRAPHQL_URL || '/graphql',
  UPLOAD_URL: import.meta.env.VITE_UPLOAD_URL || '/api/upload',
  DELETE_DOCUMENT_URL: import.meta.env.VITE_DELETE_DOCUMENT_URL || '/api/documents/delete',
  AUTH_SERVER_URL: import.meta.env.VITE_AUTH_SERVER_URL || '/auth',
  GOOGLE_AUTH_URL: import.meta.env.VITE_GOOGLE_AUTH_URL || '/auth/google',
  CALLBACK_URL: import.meta.env.VITE_CALLBACK_URL || 'http://localhost:3000/vm/auth/callback',
};
