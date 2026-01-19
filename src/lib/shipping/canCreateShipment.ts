import { Order, PaymentStatus, OrderStatus } from '@/types/orders';

/**
 * Determines if a shipment can be created for an order.
 * 
 * Rules:
 * - Online payment: requires payment_status === "paid"
 * - COD (Kapıda Ödeme): requires payment_status in ["awaiting_payment", "paid"]
 * - Order must not be cancelled
 * - Order must have address
 * - Shipment must not already be created
 * 
 * @param order - The order to check
 * @returns true if shipment can be created, false otherwise
 */
export function canCreateShipment(order: Order): boolean {
  // Check if order is cancelled
  const orderStatus: OrderStatus = order.status;
  if (orderStatus === 'iptal' || orderStatus === 'payment_failed') {
    return false;
  }

  // Check if order has address
  if (!order.address || !order.city || !order.district) {
    return false;
  }

  // Check if shipment already created
  if (
    order.shipping_tracking_number ||
    order.shipping_label_url ||
    order.shipping_status === "created"
  ) {
    return false;
  }

  // Check if payment method is online: 'iyzico' or 'havale'
  const isOnline = order.payment_method === 'iyzico' || order.payment_method === 'havale';

  // Normalize payment_status: check both payment_status field and status field
  let paymentStatus: PaymentStatus | null = (order.payment_status as PaymentStatus) || null;
  
  // Fallback to status field if payment_status is not set
  if (!paymentStatus) {
    const statusStr = String(orderStatus);
    if (statusStr === 'paid') {
      paymentStatus = 'paid';
    } else if (statusStr === 'pending_payment') {
      paymentStatus = 'awaiting_payment';
    } else if (statusStr === 'payment_failed') {
      paymentStatus = 'failed';
    }
  }

  // Online payment: requires paid status; treat legacy "success" as paid
  const isPaid = paymentStatus === 'paid' || paymentStatus === 'success';
  if (isOnline && !isPaid) {
    return false;
  }

  // All other validations already passed
  return true;
}

