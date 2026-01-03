export type OrderStatus = 'yeni' | 'hazırlanıyor' | 'kargoda' | 'tamamlandı' | 'iptal' | 'pending_payment' | 'paid' | 'payment_failed';

export type PaymentMethod = 'havale' | 'kapida' | 'iyzico';

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
  shipping_payment_type?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  shipping_label_url?: string | null;
  shipping_status?: string | null;
  shipping_error_message?: string | null;
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


