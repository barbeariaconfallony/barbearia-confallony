// Tipos para integração com Mercado Pago API
export interface CreatePixPaymentRequest {
  transaction_amount: number;
  description: string;
  payment_method_id: 'pix';
  payer: {
    email: string;
    first_name: string;
    last_name: string;
    identification: {
      type: 'CPF';
      number: string;
    };
  };
}

export interface MercadoPagoPaymentResponse {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  status_detail: string;
  transaction_amount: number;
  description: string;
  point_of_interaction: {
    transaction_data: {
      qr_code: string;
      qr_code_base64: string;
      ticket_url: string;
    };
  };
}

export interface PaymentStatusResponse {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  status_detail: string;
  transaction_amount: number;
  date_approved?: string;
  date_created: string;
  date_last_updated: string;
}