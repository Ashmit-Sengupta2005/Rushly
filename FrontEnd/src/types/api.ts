// Response/entity shapes matching the Rushly backend contract.
// Money is always INTEGER PAISE — divide by 100 for display.
// IDs are cuid strings.

// ============================================================
// Shared
// ============================================================
export type Role = 'CUSTOMER' | 'ADMIN';

/** All backend errors have this shape under 2xx-fail responses. */
export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ============================================================
// Auth
// ============================================================
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

/**
 * NOTE: on the wire, login/register return the token under key `tokens` (string)
 * while refresh returns it under `accessToken`.
 * apiClient's response interceptor renames `tokens` → `accessToken`, so these
 * types describe what callers of `api`/`apiClient` actually receive.
 */
export interface LoginResponse {
  user: User;
  accessToken: string; // normalized from the backend's `tokens` key
}
export interface RegisterResponse {
  user: User;
  accessToken: string; // normalized from the backend's `tokens` key
}
export interface RefreshResponse {
  user: User;
  accessToken: string;
}
export interface MeResponse {
  user: User;
}

export interface RegisterInput {
  email: string;
  password: string; // 8–128
  name: string;
}
export interface LoginInput {
  email: string;
  password: string;
}

// ============================================================
// Catalog
// ============================================================
export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  position: number;
}

export interface ProductCategory {
  id?: string;
  slug: string;
  name: string;
}

/** GET /categories — filter products with ?categorySlug=<slug> */
export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface CategoriesResponse {
  categories: Category[];
}

export interface ProductInventory {
  availableStock: number;
  totalStock?: number;
}

/** Shape of a product in the list endpoint (lighter). */
export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  price: number; // paise
  isActive: boolean;
  images: ProductImage[];
  category?: ProductCategory | null; // null when the product has no category
  inventory?: ProductInventory | null;
}

/** Shape of a product in the detail endpoint (full). */
export interface ProductDetail extends ProductListItem {
  description: string;
}

export interface ProductsListResponse {
  items: ProductListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ProductDetailResponse {
  product: ProductDetail;
}

export interface ListProductsQuery {
  cursor?: string;
  limit?: number;      // 1–50, default 20
  categorySlug?: string;
  search?: string;
}

// ============================================================
// Cart
// ============================================================
export interface CartItemProduct {
  id: string;
  slug: string;
  name: string;
  price: number; // current price
  isActive: boolean;
  images: ProductImage[];
  inventory: { availableStock: number };
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  priceSnapshot: number;
  product: CartItemProduct;
  lineTotal: number;
  currentLineTotal: number;
  priceChanged: boolean;
  outOfStock: boolean;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;         // paise, at snapshot prices
  currentSubtotal: number;  // paise, at current prices
  hasPriceChanges: boolean;
  hasOutOfStock: boolean;
  updatedAt: string;
}

export interface CartResponse {
  cart: Cart;
}

export interface AddCartItemInput {
  productId: string;
  quantity: number; // 1–100
}

export interface UpdateCartItemInput {
  quantity: number;
}

/**
 * POST /cart/items and PATCH /cart/items/:productId return just the touched
 * row as `{ item }` — NOT the whole cart, and without the computed fields
 * (lineTotal, outOfStock, …). Refetch the cart query for those.
 */
export interface CartItemMutationResponse {
  item: {
    id: string;
    productId: string;
    quantity: number;
    priceSnapshot: number;
    product: {
      id: string;
      slug: string;
      name: string;
      price: number;
      images: ProductImage[];
    };
  };
}

// ============================================================
// Checkout
// ============================================================
export type ReservationStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';

export interface ReservationItemLite {
  productId: string;
  quantity: number;
  priceSnapshot: number;
}

export interface ReservationItemDetail extends ReservationItemLite {
  product: {
    id: string;
    slug: string;
    name: string;
    images: ProductImage[];
  };
}

/** Snapshot sent with POST /checkout/reserve and copied onto the Order. */
export interface ShippingAddressInput {
  fullName: string;
  phone: string;       // 10–15 digits, optional leading +
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;    // backend defaults to "India"
}

/** Body of POST /checkout/reserve — items come from the server-side cart. */
export interface CreateReservationInput {
  shippingAddress: ShippingAddressInput;
}

export interface CreateReservationResponse {
  reservation: {
    reservationId: string;
    expiresAt: string; // ISO
    items: ReservationItemLite[];
    totalAmount: number;
  };
}

export interface GetReservationResponse {
  reservation: {
    id: string;
    status: ReservationStatus;
    expiresAt: string;
    items: ReservationItemDetail[];
    totalAmount: number;
    shippingAddress: ShippingAddressInput | null;
    /** Set by the payment webhook — null until status is PAID. */
    order: { id: string; status: OrderStatus } | null;
  };
}

export interface CancelReservationResponse {
  status: 'CANCELLED' | ReservationStatus;
}

export interface CreatePaymentIntentInput {
  reservationId: string;
}

export interface CreatePaymentIntentResponse {
  paymentIntentId: string;
  clientSecret: string;
  amount: number; // paise
}

// ============================================================
// Orders
// ============================================================
export type OrderStatus =
  | 'PENDING'
  | 'RESERVED'
  | 'PAID'
  | 'FULFILLED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderItem {
  productId: string;
  quantity: number;
  priceSnapshot: number;
  productNameSnapshot: string;
  productImageSnapshot: string | null;
}

export interface OrderStatusHistoryEntry {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  reason: string | null;
  changedBy: string | null;
  changedAt: string;
}

export interface OrderListItem {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  currency: 'INR';
  reservationId: string | null;         // nullable in the Prisma schema
  stripePaymentIntentId: string | null; // nullable in the Prisma schema
  createdAt: string;
  items: OrderItem[];
}

export interface OrderDetail extends OrderListItem {
  statusHistory: OrderStatusHistoryEntry[];
}

export interface OrdersListResponse {
  items: OrderListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface OrderDetailResponse {
  order: OrderDetail;
}