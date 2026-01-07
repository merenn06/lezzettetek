export interface IyzicoRetrieveResult {
  status: string;
  paymentStatus?: string;
  conversationId?: string;
  paymentId?: string;
  paidPrice?: string;
  errorMessage?: string;
  errorCode?: string;
}

export interface IyzicoCheckoutFormRequest {
  locale: string;
  conversationId: string;
  price: string;
  paidPrice: string;
  currency: string;
  basketId: string;
  paymentGroup: string;
  callbackUrl: string;
  enabledInstallments: number[];
  buyer: IyzicoBuyer;
  shippingAddress: IyzicoAddress;
  billingAddress: IyzicoAddress;
  basketItems: IyzicoBasketItem[];
}

export interface IyzicoBuyer {
  id: string;
  name: string;
  surname: string;
  gsmNumber: string;
  email: string;
  identityNumber: string;
  registrationAddress: string;
  ip: string;
  city: string;
  country: string;
  zipCode: string;
  registrationDate: string;
  lastLoginDate: string;
}

export interface IyzicoAddress {
  contactName: string;
  city: string;
  country: string;
  address: string;
  zipCode: string;
}

export interface IyzicoBasketItem {
  id: string;
  name: string;
  category1: string;
  category2: string;
  itemType: string;
  price: string;
}

export interface IyzicoCheckoutFormResult {
  status: string;
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  errorMessage?: string;
  errorCode?: string;
}








