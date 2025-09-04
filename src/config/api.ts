export const API_CONFIG = {
  BASE_URL: 'https://vxfofymcvcycfttzhftf.supabase.co/functions/v1',
  
  ENDPOINTS: {
    CREATE_PIX_PAYMENT: '/create-pix-payment',
    CHECK_PAYMENT_STATUS: '/check-payment-status',
  }
};

// Headers padrão para requisições Supabase
export const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Zm9meW1jdmN5Y2Z0dHpoZnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNTgxNTYsImV4cCI6MjA3MTgzNDE1Nn0.0cy7z0cjbGBelTlFQRCTzIMDPP2rWByAjVf7Gpv332E`,
});