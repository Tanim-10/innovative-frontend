// API Service for connecting to external backend
const RAW_API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000');
const API_URL = RAW_API_URL.endsWith('/') ? RAW_API_URL.slice(0, -1) : RAW_API_URL;

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
}

// Helper to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Helper to set auth token
export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

// Helper to remove auth token
export const removeAuthToken = (): void => {
  localStorage.removeItem('authToken');
};

// Base fetch wrapper with auth
const fetchWithAuth = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
};

// ============ AUTH API ============
export const authApi = {
  register: async (data: {
    name: string;
    email: string;
    password: string;
    mobile?: string;
  }) => {
    return fetchWithAuth<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login: async (data: { email: string; password: string }) => {
    return fetchWithAuth<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  googleLogin: async (data: { tokenId: string }) => {
    return fetchWithAuth<{ token: string; user: User }>('/api/auth/google-login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMe: async () => {
    return fetchWithAuth<User>('/api/auth/me');
  },

  forgotPassword: async (data: { email: string }) => {
    return fetchWithAuth('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  resetPassword: async (data: { token: string; password: string }) => {
    return fetchWithAuth('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  verifyEmail: async (token: string) => {
    return fetchWithAuth<{ token: string; user: User }>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET',
    });
  },

  resendVerifyEmail: async (email: string) => {
    return fetchWithAuth('/api/auth/resend-verify-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};

const stripHtml = (value: string) =>
  value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(li|p|div|h\d)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractQuickNotes = (longDescription: string, shortDescription: string) => {
  const text = stripHtml(longDescription || '');
  const chunks = text
    .split(/[.\n]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 6);
  const notes = Array.from(new Set(chunks)).slice(0, 6);
  if (notes.length > 0) return notes;
  const fallback = shortDescription?.trim();
  return fallback ? [fallback] : [];
};

// Transform backend product to frontend Product shape
const toFrontendProduct = (p: Record<string, unknown>): Product => {
  if (!p || typeof p !== 'object') {
    return {
      _id: '',
      name: '',
      shortDescription: '',
      longDescription: '',
      price: 0,
      mrp: 0,
    gstMode: 'including',
    gstPercentage: 0,
      category: '',
      subcategory: '',
      images: [],
      videos: [],
      cloudinaryUrl: '',
      stock: 0,
      sku: '',
      features: [],
      specifications: {},
      createdAt: '',
      updatedAt: '',
    };
  }
  const images = Array.isArray(p.images)
    ? (p.images as Array<{ url?: string } | string>)
        .map((i) => (typeof i === 'string' ? i : i?.url || ''))
        .filter(Boolean)
    : [];
  const videos = Array.isArray(p.videos)
    ? (p.videos as Array<{ url?: string } | string>)
        .map((v) => (typeof v === 'string' ? v : v?.url || ''))
        .filter(Boolean)
    : [];
  return {
    _id: (p._id || p.id || p.sku)?.toString() || '',
    name: (p.name as string) || '',
    shortDescription: (p.shortDescription as string) || '',
    longDescription: (p.longDescription as string) || '',
    price: Number(p.sellingPrice ?? p.price) || 0,
    mrp: Number(p.mrp) || 0,
    gstMode: (p.gstMode as 'including' | 'excluding') || 'including',
    gstPercentage: Number(p.gstPercentage) || 0,
    category:
      Array.isArray(p.categories) && (p.categories as string[]).length
        ? (p.categories as string[])[0]
        : (p.category as string) || '',
    subcategory: (p.subcategory as string) || '',
    images,
    videos,
    cloudinaryUrl: images[0] || '',
    stock: Number(p.stockQuantity ?? p.stock) || 0,
    sku: (p.sku as string) || '',
    features: Array.isArray(p.features) && (p.features as string[]).length
      ? (p.features as string[])
      : extractQuickNotes((p.longDescription as string) || '', (p.shortDescription as string) || ''),
    specifications: (p.specifications as Record<string, string>) || {},
    datasheet: (p.datasheet as string) || undefined,
    createdAt: (p.createdAt as string) || '',
    updatedAt: (p.updatedAt as string) || '',
  };
};

// ============ PRODUCTS API ============
const PAGE_SIZE = 20;

export const productsApi = {
  /** Fetch products. With skip/limit returns paginated list and total; without params returns all (legacy). */
  getAll: async (params?: {
    category?: string;
    search?: string;
    skip?: number;
    limit?: number;
    sort?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.skip != null) searchParams.set('skip', String(params.skip));
    if (params?.limit != null) searchParams.set('limit', String(params.limit));
    if (params?.sort) searchParams.set('sort', params.sort);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetchWithAuth<unknown>(`/api/products${queryString}`);
    const payload = res as ApiResponse<unknown> & { total?: number };
    const data = payload.data ?? res;
    const arr = Array.isArray(data) ? data : [];
    const list = arr.map((p) => toFrontendProduct(p as Record<string, unknown>));
    const total = Number(payload.total) || list.length;
    return {
      success: true,
      data: list,
      total,
      message: '',
    } as ApiResponse<Product[]> & { total: number };
  },

  /** Page size for listing (first page and load-more batches). */
  pageSize: PAGE_SIZE,

  getById: async (id: string) => {
    const res = await fetchWithAuth<unknown>(`/api/products/${id}`);
    const raw = (res as ApiResponse<unknown>).data ?? res;
    if (raw) {
      return { success: true, data: toFrontendProduct(raw as Record<string, unknown>), message: '' } as ApiResponse<Product>;
    }
    return { success: false, data: undefined as unknown as Product, message: 'Product not found' };
  },
};

// ============ CATEGORIES API ============
export const categoriesApi = {
  getAll: async (): Promise<ApiResponse<Category[]>> => {
    const res = await fetchWithAuth<unknown[]>('/api/categories');
    const arr = (res as ApiResponse<unknown>).data ?? res;
    const list = Array.isArray(arr)
      ? arr.map((c: Record<string, unknown>) => ({
          _id: (c._id || c.id || c.slug)?.toString() || '',
          name: (c.name as string) || '',
          slug: (c.slug as string) || '',
          icon: '',
          image: '',
        }))
      : [];
    return { success: true, data: list, message: '' } as ApiResponse<Category[]>;
  },
};

// ============ WISHLIST API ============
export const wishlistApi = {
  get: async () => {
    const res = await fetchWithAuth<unknown[]>('/api/wishlist');
    const arr = (res as ApiResponse<unknown>).data ?? res;
    const list = Array.isArray(arr) ? arr.map((p) => toFrontendProduct(p as Record<string, unknown>)) : [];
    return { success: true, data: list, message: '' } as ApiResponse<Product[]>;
  },

  add: async (productId: string) => {
    return fetchWithAuth('/api/wishlist/add', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  },

  remove: async (productId: string) => {
    return fetchWithAuth(`/api/wishlist/remove/${productId}`, {
      method: 'DELETE',
    });
  },
};

const parseCartPayload = (raw: unknown): Array<{ product: Product; quantity: number }> => {
  const products = (raw as { products?: Array<Record<string, unknown>> }).products || [];
  if (!Array.isArray(products)) return [];
  return products
    .map((item) => {
      const product = item.product as Record<string, unknown> | undefined;
      if (!product) return null;
      return {
        product: toFrontendProduct(product),
        quantity: Number(item.quantity) || 1,
      };
    })
    .filter(Boolean) as Array<{ product: Product; quantity: number }>;
};

// ============ CART API ============
export const cartApi = {
  get: async () => {
    const res = await fetchWithAuth<Record<string, unknown>>('/api/cart');
    const raw = (res as ApiResponse<Record<string, unknown>>).data ?? res;
    const items = parseCartPayload(raw);
    return { success: true, data: items, message: '' };
  },

  add: async (productId: string, quantity: number = 1) => {
    const res = await fetchWithAuth<Record<string, unknown>>('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
    const raw = (res as ApiResponse<Record<string, unknown>>).data ?? res;
    return { success: true, data: parseCartPayload(raw), message: '' };
  },

  setQuantity: async (productId: string, quantity: number) => {
    const res = await fetchWithAuth<Record<string, unknown>>('/api/cart/item', {
      method: 'PUT',
      body: JSON.stringify({ productId, quantity }),
    });
    const raw = (res as ApiResponse<Record<string, unknown>>).data ?? res;
    return { success: true, data: parseCartPayload(raw), message: '' };
  },

  remove: async (productId: string) => {
    const res = await fetchWithAuth<Record<string, unknown>>('/api/cart/remove', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
    const raw = (res as ApiResponse<Record<string, unknown>>).data ?? res;
    return { success: true, data: parseCartPayload(raw), message: '' };
  },

  clear: async () => {
    const res = await fetchWithAuth<Record<string, unknown>>('/api/cart/clear', {
      method: 'POST',
    });
    const raw = (res as ApiResponse<Record<string, unknown>>).data ?? res;
    return { success: true, data: parseCartPayload(raw), message: '' };
  },
};

// Map backend order status to frontend
const orderStatusMap: Record<string, Order['orderStatus']> = {
  pending: 'Placed',
  confirmed: 'Packed',
  processing: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const paymentStatusMap: Record<string, Order['paymentStatus']> = {
  paid: 'Paid',
  unpaid: 'Pending',
  failed: 'Failed',
};

const resolveProductId = (value: unknown) => {
  if (value && typeof value === 'object' && '_id' in value) {
    return (value as { _id?: unknown })._id;
  }
  return value;
};

const toFrontendOrder = (o: Record<string, unknown>): Order => ({
  _id: (o._id || o.id)?.toString() || '',
  userId: (o.customerId || o.userId)?.toString() || '',
  products: Array.isArray(o.items)
    ? (o.items as Array<{ productId: unknown; quantity: number; price: number; name?: string; image?: string }>).map((i) => ({
        productId: resolveProductId(i.productId)?.toString() || '',
        qty: i.quantity,
        price: i.price,
        name: (i.name as string) || '',
        image: (i.image as string) || '',
      }))
    : [],
  address: (() => {
    const a = (o.addressSnapshot || o.address) as Record<string, unknown> | undefined;
    if (!a) return { fullName: '', mobile: '', addressLine1: '', city: '', state: '', pincode: '' };
    return {
      _id: (a._id as string) || undefined,
      fullName: (a.fullName as string) || '',
      mobile: (a.mobile || a.phone) as string || '',
      addressLine1: (a.addressLine1 || a.street) as string || '',
      addressLine2: (a.addressLine2 as string) || undefined,
      city: (a.city as string) || '',
      state: (a.state as string) || '',
      pincode: (a.pincode || a.postalCode) as string || '',
      isDefault: (a.isDefault as boolean) || false,
    };
  })(),
  totalAmount: Number(o.totalAmount ?? (o.pricing as { totalAmount?: number })?.totalAmount) || 0,
  deliveryCharge: Number(o.delivery_charge ?? (o.pricing as { deliveryCharge?: number })?.deliveryCharge) ?? 0,
  paymentStatus: paymentStatusMap[(o.paymentStatus as string) || ''] || 'Pending',
  orderStatus: orderStatusMap[(o.orderStatus as string) || ''] || 'Placed',
  paymentMethod: (o.paymentMethod as string) || '',
  trackingLink: (o.trackingLink || (o.delivery as { trackingLink?: string })?.trackingLink) as string | undefined,
  trackingMessage: (o.trackingMessage || (o.delivery as { trackingMessage?: string })?.trackingMessage) as string | undefined,
  invoiceUrl: ((o.invoice as { invoiceUrl?: string })?.invoiceUrl as string) || undefined,
  invoiceNumber: ((o.invoice as { invoiceNumber?: string })?.invoiceNumber as string) || undefined,
  createdAt: (o.createdAt as string) || '',
});

// ============ ORDERS API ============
export const ordersApi = {
  create: async (data: {
    products: Array<{ productId: string; qty: number; price: number }>;
    address: Address;
    totalAmount: number;
  }) => {
    return fetchWithAuth<Order>('/api/orders/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMyOrders: async () => {
    const res = await fetchWithAuth<unknown[]>('/api/orders/my-orders');
    const arr = (res as ApiResponse<unknown>).data ?? res;
    const list = Array.isArray(arr) ? arr : [];
    return { success: true, data: list.map((o) => toFrontendOrder(o as Record<string, unknown>)), message: '' } as ApiResponse<Order[]>;
  },

  getById: async (orderId: string) => {
    const res = await fetchWithAuth<unknown>(`/api/orders/${orderId}`);
    const raw = (res as ApiResponse<unknown>).data ?? res;
    return { success: true, data: toFrontendOrder(raw as Record<string, unknown>), message: '' } as ApiResponse<Order>;
  },

  /** Guest tracking: order ID + email must match the account that placed the order. No auth. */
  trackOrder: async (orderId: string, email: string): Promise<ApiResponse<Order>> => {
    const res = await fetch(`${API_URL}/api/orders/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderId.trim(), email: email.trim() }),
    });
    const json = (await res.json().catch(() => ({}))) as ApiResponse<unknown> & { message?: string };
    if (!res.ok) {
      return {
        success: false,
        data: undefined as unknown as Order,
        message: json.message || 'Order not found. Check your order ID and the email on your account.',
      };
    }
    const raw = json.data;
    if (!raw || typeof raw !== 'object') {
      return { success: false, data: undefined as unknown as Order, message: 'Order not found.' };
    }
    return { success: true, data: toFrontendOrder(raw as Record<string, unknown>), message: '' };
  },

  /** Generate PDF invoice for confirmed/paid order (if not already generated). */
  generateInvoice: async (orderId: string) => {
    const res = await fetchWithAuth<{ invoiceNumber: string; invoiceUrl: string }>(`/api/orders/${orderId}/generate-invoice`, {
      method: 'POST',
    });
    return res;
  },

  /** Fetch invoice PDF as blob (served with correct Content-Type so browser can display it). */
  getInvoiceBlob: async (orderId: string): Promise<Blob> => {
    const token = localStorage.getItem('authToken');
    const url = `${API_URL}/api/orders/${orderId}/invoice`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const contentType = res.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      const body = isJson ? await res.json().catch(() => ({})) : {};
      const message = (body as { message?: string }).message || res.statusText || 'Failed to load invoice';
      throw new Error(message);
    }
    return res.blob();
  },
};

// ============ REVIEWS & COMMENTS API ============
export interface Review {
  _id: string;
  productId: string;
  userId: string | { _id?: string; name?: string; profileImage?: string };
  userName?: string;
  userProfileImage?: string;
  rating: number;
  valueForMoney?: number;
  durability?: number;
  deliverySpeed?: number;
  comment?: string;
  pros?: string;
  cons?: string;
  status?: 'approved' | 'pending' | 'rejected';
  createdAt?: string;
}

export interface Comment {
  _id: string;
  productId: string;
  userId: string;
  userName?: string;
  comment: string;
  createdAt?: string;
}

export const reviewsApi = {
  getByProduct: async (productId: string) => {
    const query = new URLSearchParams({ productId }).toString();
    return fetchWithAuth<Review[]>(`/api/reviews/public?${query}`);
  },
  getMode: async () => {
    return fetchWithAuth<{ mode: 'any-user' | 'delivered-only' }>('/api/reviews/mode');
  },
  create: async (data: {
    productId: string;
    orderId?: string;
    rating: number;
    valueForMoney?: number;
    durability?: number;
    deliverySpeed?: number;
    comment?: string;
    pros?: string;
    cons?: string;
  }) => {
    return fetchWithAuth<Review>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  deleteMine: async (reviewId: string) => {
    return fetchWithAuth<{ message: string }>(`/api/reviews/my/${reviewId}`, {
      method: 'DELETE',
    });
  },
  updateMine: async (
    reviewId: string,
    data: {
      rating?: number;
      valueForMoney?: number;
      durability?: number;
      deliverySpeed?: number;
      comment?: string;
      pros?: string;
      cons?: string;
    }
  ) => {
    return fetchWithAuth<Review>(`/api/reviews/my/${reviewId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

export const commentsApi = {
  getByProduct: async (productId: string) => {
    const query = new URLSearchParams({ productId }).toString();
    return fetchWithAuth<Comment[]>(`/api/comments?${query}`);
  },
};

// ============ COUPONS (checkout) ============
export const couponsApi = {
  apply: async (body: { coupon_code: string; order_total: number }) => {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/api/coupons/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      discount_amount?: number;
      final_price?: number;
      message?: string;
    };
    if (!response.ok) {
      throw new Error(json.message || 'Could not apply coupon');
    }
    if (!json.success || json.discount_amount == null || json.final_price == null) {
      throw new Error(json.message || 'Invalid coupon response');
    }
    return {
      success: true as const,
      discount_amount: json.discount_amount,
      final_price: json.final_price,
      message: json.message || 'Coupon applied',
    };
  },
};

// ============ DELIVERY API (for checkout) ============
export const deliveryApi = {
  getStateCharges: async (state: string) => {
    const res = await fetch(`${API_URL}/api/delivery/state-charges?state=${encodeURIComponent(state || '')}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to fetch delivery charges' }));
      throw new Error(err.message || 'Failed to fetch delivery charges');
    }
    const json = await res.json();
    return json.data as { state: string; defaultShippingCharge: number; manualBaseCharge: number };
  },
};

// ============ PAYMENTS API ============
export const paymentsApi = {
  createRazorpayOrder: async (data: {
    products: Array<{ productId: string; qty: number }>;
    address: Address;
    deliveryAgreement: boolean;
    deliveryMobileNumber: string;
    couponCode?: string;
  }) => {
    return fetchWithAuth<{
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      deliveryCharge?: number;
      totalBeforeCoupon?: number;
      discountAmount?: number;
      totalAmount?: number;
    }>(
      '/api/payments/razorpay/order',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },
  verifyRazorpayPayment: async (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    products: Array<{ productId: string; qty: number }>;
    address: Address;
    deliveryAgreement: boolean;
    deliveryMobileNumber: string;
    couponCode?: string;
  }) => {
    return fetchWithAuth<{ orderId: string }>(
      '/api/payments/razorpay/verify',
      {
        method: 'POST',
        body: JSON.stringify(data),
        keepalive: true,
      }
    );
  },
  reconcileRazorpayOrder: async (data: {
    razorpay_order_id: string;
    products: Array<{ productId: string; qty: number }>;
    address: Address;
    deliveryAgreement: boolean;
    deliveryMobileNumber: string;
    couponCode?: string;
  }) => {
    return fetchWithAuth<{ orderId: string }>(
      '/api/payments/razorpay/reconcile',
      {
        method: 'POST',
        body: JSON.stringify(data),
        keepalive: true,
      }
    );
  },
  reportFailure: async (data: { reason?: string }) => {
    return fetchWithAuth('/api/payments/razorpay/failure', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============ USER API ============
export const userApi = {
  updateProfile: async (data: { name?: string; mobile?: string }) => {
    return fetchWithAuth('/api/user', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    return fetchWithAuth<{ message: string }>('/api/user/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Address management
  addAddress: async (address: Omit<Address, '_id'>) => {
    return fetchWithAuth<User>('/api/user/addresses', {
      method: 'POST',
      body: JSON.stringify(address),
    });
  },

  updateAddress: async (addressId: string, address: Partial<Address>) => {
    return fetchWithAuth<User>(`/api/user/addresses/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify(address),
    });
  },

  deleteAddress: async (addressId: string) => {
    return fetchWithAuth<User>(`/api/user/addresses/${addressId}`, {
      method: 'DELETE',
    });
  },

  setDefaultAddress: async (addressId: string) => {
    return fetchWithAuth<User>(`/api/user/addresses/${addressId}/default`, {
      method: 'PUT',
    });
  },
};

// ============ TUTORS API ============
export const tutorsApi = {
  apply: async (data: TutorApplicationData) => {
    return fetchWithAuth<User>('/api/tutors/apply', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  getAll: async (params?: { search?: string; expertise?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.expertise) q.set('expertise', params.expertise);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchWithAuth<User[]>(`/api/tutors${qs}`);
  },
  getById: async (id: string) => {
    return fetchWithAuth<User>(`/api/tutors/${id}`);
  },
};

// ============ COURSES API ============
export const coursesApi = {
  getAll: async (params?: { search?: string; difficulty?: string; topic?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.difficulty) q.set('difficulty', params.difficulty);
    if (params?.topic) q.set('topic', params.topic);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchWithAuth<Course[]>(`/api/courses${qs}`);
  },
  getTutorCourses: async () => {
    return fetchWithAuth<Course[]>('/api/courses/tutor');
  },
  getEnrolledCourses: async () => {
    return fetchWithAuth<Course[]>('/api/courses/enrolled');
  },
  getById: async (id: string) => {
    return fetchWithAuth<Course & { isEnrolled?: boolean }>(`/api/courses/${id}`);
  },
  create: async (data: Partial<Course>) => {
    return fetchWithAuth<Course>('/api/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: Partial<Course>) => {
    return fetchWithAuth<Course>(`/api/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteCourse: async (id: string) => {
    return fetchWithAuth<{ message: string }>(`/api/courses/${id}`, {
      method: 'DELETE',
    });
  },
  getCourseViewer: async (id: string) => {
    return fetchWithAuth<Course>(`/api/courses/${id}/viewer`);
  },
  purchase: async (id: string) => {
    return fetchWithAuth<{
      enrolled: boolean;
      data: {
        orderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
        coursePrice?: number;
        _id?: string;
      };
    }>(`/api/courses/${id}/purchase`, {
      method: 'POST',
    });
  },
  verifyPurchase: async (id: string, data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
    return fetchWithAuth<unknown>(`/api/courses/${id}/verify-purchase`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============ SESSIONS API ============
export const sessionsApi = {
  createSlot: async (data: { date: string; time: string; topic: string; cost: number }) => {
    return fetchWithAuth<SessionSlot>('/api/sessions/slots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getAvailableSlots: async (tutorId?: string) => {
    const q = tutorId ? `?tutorId=${tutorId}` : '';
    return fetchWithAuth<SessionSlot[]>(`/api/sessions/slots${q}`);
  },
  getTutorSlots: async () => {
    return fetchWithAuth<SessionSlot[]>('/api/sessions/tutor');
  },
  getStudentSessions: async () => {
    return fetchWithAuth<SessionSlot[]>('/api/sessions/student');
  },
  bookSlot: async (id: string) => {
    return fetchWithAuth<{
      booked: boolean;
      data: {
        orderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
        cost?: number;
        _id?: string;
      };
    }>(`/api/sessions/slots/${id}/book`, {
      method: 'POST',
    });
  },
  verifyBooking: async (id: string, data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
    return fetchWithAuth<SessionSlot>(`/api/sessions/slots/${id}/verify-booking`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============ WORKSHOPS API ============
export interface Workshop {
  _id: string;
  title: string;
  description: string;
  hostName: string;
  hostEmail?: string;
  hostId?: string | { _id: string; name: string; profileImage?: string; bio?: string };
  hostLinkedIn?: string;
  thumbnail?: string;
  date: string;
  time: string;
  duration: string;
  meetingLink: string;
  status: 'pending' | 'approved' | 'rejected';
  enrolledStudents?: string[];
}

export const workshopsApi = {
  getAll: async () => {
    return fetchWithAuth<Workshop[]>('/api/workshops');
  },
  getEnrolled: async () => {
    return fetchWithAuth<Workshop[]>('/api/workshops/enrolled');
  },
  getHosted: async () => {
    return fetchWithAuth<Workshop[]>('/api/workshops/hosted');
  },
  enroll: async (id: string) => {
    return fetchWithAuth<Workshop>(`/api/workshops/${id}/enroll`, {
      method: 'POST',
    });
  },
};

// ============ INTERNSHIPS API ============
export interface InternshipApplication {
  _id: string;
  studentId: string;
  name: string;
  email: string;
  mobile: string;
  skills: string[];
  resumeUrl: string;
  coverLetter: string;
  portfolioUrl?: string;
  status: 'pending' | 'under-review' | 'shortlisted' | 'rejected';
  createdAt: string;
}

export const internshipsApi = {
  apply: async (data: {
    name: string;
    email: string;
    mobile: string;
    skills: string[];
    resumeUrl: string;
    coverLetter: string;
    portfolioUrl?: string;
  }) => {
    return fetchWithAuth<InternshipApplication>('/api/internships/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getMyApplications: async () => {
    return fetchWithAuth<InternshipApplication[]>('/api/internships/my-applications');
  },
};

// ============ TYPES ============
export interface User {
  _id: string;
  name: string;
  email: string;
  mobile?: string;
  /** Server may omit; false means number not OTP-verified for this account */
  mobileVerified?: boolean;
  addresses: Address[];
  createdAt: string;
  role?: 'student' | 'tutor' | 'admin';
  tutorStatus?: 'pending' | 'approved' | 'rejected';
  bio?: string;
  expertise?: string[];
  socials?: {
    linkedin?: string;
    googleScholar?: string;
    orcid?: string;
    medium?: string;
  };
  education?: {
    college?: string;
    graduationYear?: number;
    course?: string;
  };
}

export interface TutorApplicationData {
  bio: string;
  expertise: string[];
  socials: {
    linkedin: string;
    googleScholar?: string;
    orcid?: string;
    medium?: string;
  };
  education: {
    college: string;
    graduationYear: number;
    course: string;
  };
}

export interface Lecture {
  _id?: string;
  title: string;
  description?: string;
  videoUrl: string;
  attachmentUrl?: string;
}

export interface Course {
  _id: string;
  tutorId: string | { _id: string; name: string; profileImage?: string; bio?: string; expertise?: string[] };
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topic: string;
  price: number;
  thumbnailUrl?: string;
  lectures: Lecture[];
  isPublished: boolean;
  createdAt: string;
  isEnrolled?: boolean;
}

export interface SessionSlot {
  _id: string;
  tutorId: string | { _id: string; name: string; profileImage?: string; bio?: string; expertise?: string[] };
  date: string;
  time: string;
  topic: string;
  cost: number;
  status: 'available' | 'booked';
  bookedBy?: string | { _id: string; name: string; email: string; mobile?: string };
  paymentId?: string;
  meetingLink?: string;
  createdAt: string;
}

export interface Address {
  _id?: string;
  fullName: string;
  mobile: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export interface Product {
  _id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  price: number;
  mrp: number;
  gstMode?: 'including' | 'excluding';
  gstPercentage?: number;
  category: string;
  subcategory: string;
  images: string[];
  cloudinaryUrl: string;
  stock: number;
  sku: string;
  features: string[];
  specifications: Record<string, string>;
  datasheet?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  image: string;
}

export interface Order {
  _id: string;
  userId: string;
  products: Array<{
    productId: string;
    qty: number;
    price: number;
    name?: string;
    image?: string;
  }>;
  address: Address;
  totalAmount: number;
  deliveryCharge?: number;
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  orderStatus: 'Placed' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentMethod?: string;
  trackingLink?: string;
  trackingMessage?: string;
  estimatedDelivery?: string;
  invoiceUrl?: string;
  invoiceNumber?: string;
  createdAt: string;
}
