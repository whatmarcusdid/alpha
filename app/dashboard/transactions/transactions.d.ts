export interface Transaction {
    id: string;
    orderId: string;
    description: string;
    date: Date;
    amount: number;
    status: 'completed' | 'pending' | 'failed';
    paymentMethodBrand: string;
    paymentMethodLast4: string;
    invoiceUrl?: string;
  }
  