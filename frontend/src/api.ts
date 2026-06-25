export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3200/api';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export interface Agent {
  id: number;
  name: string;
  email: string;
  phone?: string;
  licenseNumber?: string;
}

export interface Property {
  id: number;
  title: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  status: 'available' | 'pending' | 'sold';
  description?: string;
  agentId?: number | null;
  agentName?: string;
  agentEmail?: string;
}

export interface DashboardStats {
  statusCounts: { status: string; count: number }[];
  pricing: { avgPrice: number; minPrice: number; maxPrice: number };
  byCity: { city: string; count: number }[];
}

export type PropertyInput = Omit<Property, 'id' | 'agentName' | 'agentEmail'>;
export type AgentInput = Omit<Agent, 'id'>;

const TOKEN_KEY = 'bldbusiness_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Request failed', res.status);

  return data as T;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    apiFetch<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  me: () => apiFetch<User>('/auth/me'),
};

export const agentsApi = {
  list: () => apiFetch<Agent[]>('/agents'),
  get: (id: number) => apiFetch<Agent>(`/agents/${id}`),
  create: (data: AgentInput) =>
    apiFetch<Agent>('/agents', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: AgentInput) =>
    apiFetch<Agent>(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) => apiFetch<void>(`/agents/${id}`, { method: 'DELETE' }),
};

export const propertiesApi = {
  list: () => apiFetch<Property[]>('/properties'),
  get: (id: number) => apiFetch<Property>(`/properties/${id}`),
  stats: () => apiFetch<DashboardStats>('/properties/stats'),
  create: (data: PropertyInput) =>
    apiFetch<Property>('/properties', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: PropertyInput) =>
    apiFetch<Property>(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) => apiFetch<void>(`/properties/${id}`, { method: 'DELETE' }),
};

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export const emptyProperty = (): PropertyInput => ({
  title: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  price: 0,
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1500,
  status: 'available',
  description: '',
  agentId: null,
});

export const emptyAgent = (): AgentInput => ({
  name: '',
  email: '',
  phone: '',
  licenseNumber: '',
});
