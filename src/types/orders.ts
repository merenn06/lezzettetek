export type OrderStatus = 'yeni' | 'hazırlanıyor' | 'kargoda' | 'tamamlandı' | 'iptal' | 'pending_payment' | 'paid' | 'payment_failed';

export type PaymentMethod = 'havale' | 'kapida' | 'iyzico' | 'cod';

export type PaymentStatus = 'unpaid' | 'awaiting_payment' | 'paid' | 'failed' | 'refunded';

export type Order = {
  id: string;
  created_at: string;
  customer_name: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  district: string;
  note: string | null;
  payment_method: PaymentMethod;
  status: OrderStatus;
  total_price: number;
  // Optional shipping fields (populated once shipment is created)
  shipping_carrier?: string | null;
  shipping_tracking_number?: string | null;
  shipping_reference_number?: string | null;
  shipping_payment_type?: "cash" | "card" | null; // COD tahsilat tipi: cash (nakit) | card (kredi kartı)
  shipped_at?: string | null;
  delivered_at?: string | null;
  shipping_label_url?: string | null;
  shipping_status?: string | null;
  shipping_error_message?: string | null;
  // Yurtiçi COD / report debug fields
  yurtici_cod_doc_id?: string | null;
  yurtici_cod_doc_type?: string | null;
  yurtici_cod_confirmed?: boolean | null;
  yurtici_report_document_types?: string[] | null;
  yurtici_tt_collection_type?: string | null;
  yurtici_tt_document_id?: string | null;
  yurtici_tt_invoice_amount?: number | null;
  yurtici_tt_document_save_type?: string | null;
  yurtici_dc_credit_rule?: string | null;
  yurtici_dc_selected_credit?: string | null;
  yurtici_job_id?: number | null;
  yurtici_create_out_flag?: string | null;
  yurtici_create_out_result?: string | null;
  yurtici_create_err_code?: string | null;
  yurtici_create_err_message?: string | null;
  // Optional payment fields (populated for iyzico payments)
  payment_provider?: string | null;
  payment_token?: string | null;
  payment_status?: string | null;
  paid_at?: string | null;
  iyzico_payment_id?: string | null;
  postal_code?: string | null;
};

export type OrderItem = {
  id: string;
  created_at: string;
  order_id: string;
  product_id: string; // UUID, matches products.id type
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

// Extended types for API requests/responses
export type CreateOrderRequest = {
  customer_name: string;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  district: string;
  note?: string | null;
  payment_method: PaymentMethod;
  total_price: number;
  items: Omit<OrderItem, 'id' | 'created_at' | 'order_id'>[];
};

export type OrderWithItems = Order & {
  items: OrderItem[];
};


