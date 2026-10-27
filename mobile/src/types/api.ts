/**
 * Shapes returned by the backend (backend/src/**\/entities). Dates arrive as ISO strings.
 * Keep in sync with docs/data-model-and-flow.md.
 */

export type UserRole = 'customer' | 'staff' | 'admin';

export type User = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  accessToken: string;
  /** Seconds until accessToken expires. */
  expiresIn: number;
  refreshToken: string;
  user: User;
};

export type Option = {
  id: string;
  optionGroupId: string;
  name: string;
  /** VND added to the product price. */
  priceDelta: number;
  isAvailable: boolean;
  sortOrder: number;
};

export type OptionGroup = {
  id: string;
  productId: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  options: Option[];
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  /** VND. */
  basePrice: number;
  isAvailable: boolean;
  sortOrder: number;
};

export type ProductDetail = Product & { optionGroups: OptionGroup[] };

export type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  products: Product[];
};

export type Store = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  imageUrl: string | null;
  isActive: boolean;
};

export type OrderStatus =
  'pending_payment' | 'paid' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export type OrderItemOption = {
  id: string;
  groupName: string;
  optionName: string;
  priceDelta: number;
};

export type OrderItem = {
  id: string;
  productId: string | null;
  productName: string;
  productImageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  options?: OrderItemOption[];
};

export type OrderStatusHistoryEntry = {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  createdAt: string;
};

export type PaymentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'canceled'
  | 'succeeded';

export type Payment = {
  id: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  amountRefunded: number;
  /** e.g. "Your card was declined." */
  lastError: string | null;
  createdAt: string;
};

/** Returned by POST /orders/:id/payment: what Stripe PaymentSheet needs. */
export type PaymentSheetParams = {
  paymentIntentId: string;
  clientSecret: string;
  publishableKey: string | null;
  amount: number;
  currency: string;
};

export type Order = {
  id: string;
  number: number;
  /** e.g. BRW-1001 */
  code: string;
  userId: string;
  storeId: string;
  status: OrderStatus;
  subtotal: number;
  total: number;
  currency: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  store: Store;
  items: OrderItem[];
  statusHistory?: OrderStatusHistoryEntry[];
  payments?: Payment[];
};

/** Body of POST /orders: only ids and quantities, the server prices everything. */
export type CreateOrderInput = {
  storeId: string;
  note?: string;
  items: { productId: string; quantity: number; optionIds: string[] }[];
};

/** An order as staff see it (GET /admin/orders): includes the customer. */
export type StaffOrder = Order & { user: User };

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};
