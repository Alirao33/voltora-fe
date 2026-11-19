// One function per endpoint in the Voltora OpenAPI spec.
import { api, API_BASE, getTokens, qs } from './api';
import type * as T from './types';

const enc = encodeURIComponent;

export const Auth = {
  register: (b: { username: string; email: string; password: string; phone?: string | null; full_name?: string | null }) =>
    api<T.UserOut>('/register', { method: 'POST', body: b, auth: false }),
  login: (username: string, password: string) =>
    api<T.Token>('/token', { method: 'POST', form: { username, password, grant_type: 'password' }, auth: false }),
  otpRequest: (phone: string) => api<any>('/auth/otp/request', { method: 'POST', body: { phone }, auth: false }),
  otpVerify: (b: { phone: string; code: string; full_name?: string | null }) =>
    api<T.Token>('/auth/otp/verify', { method: 'POST', body: b, auth: false }),
  adminLogin: (username: string, password: string) =>
    api<any>('/auth/admin/login', { method: 'POST', body: { username, password }, auth: false }),
  adminVerify: (challenge_id: number, code: string) =>
    api<T.Token>('/auth/admin/verify', { method: 'POST', body: { challenge_id, code }, auth: false }),
  me: () => api<T.UserOut>('/users/me'),
};

export const Users = {
  list: () => api<T.UserOut[]>('/users'),
  enable: (id: number) => api<T.UserOut>(`/users/${id}/enable`, { method: 'PATCH' }),
  disable: (id: number) => api<T.UserOut>(`/users/${id}/disable`, { method: 'PATCH' }),
  update: (id: number, b: T.UserAdminUpdate) => api<T.UserOut>(`/users/${id}`, { method: 'PATCH', body: b }),
};

export const Rider = {
  subscription: () => api<any>('/api/rider/subscription'),
  lockerPass: () => api<any>('/api/rider/locker-pass'),
  setLockerStation: (station_id: string) => api<any>('/api/rider/locker-pass/station', { method: 'POST', body: { station_id } }),
  cancelSubscription: () => api<any>('/api/rider/subscription/cancel', { method: 'POST' }),
  subscribe: (planId: number | string, b: { payment_method: T.PaymentMethod; payment_reference: string }) =>
    api<T.SubscriptionOut>(`/api/rider/plans/${enc(String(planId))}/subscribe`, { method: 'POST', body: b }),
  createOrder: (b: T.OrderCreate) => api<T.OrderOut>('/api/rider/orders', { method: 'POST', body: b }),
  orders: (limit = 50) => api<T.OrderOut[]>('/api/rider/orders', { query: { limit } }),
  order: (id: number | string) => api<T.OrderOut>(`/api/rider/orders/${id}`),
  unlock: (id: number | string, pickup_code: string) =>
    api<T.OrderOut>(`/api/rider/orders/${id}/unlock`, { method: 'POST', body: { pickup_code } }),
  complete: (id: number | string, returned_pack_id?: string | null) =>
    api<T.OrderOut>(`/api/rider/orders/${id}/complete`, { method: 'POST', body: { returned_pack_id: returned_pack_id || null } }),
  messages: (id: number | string) => api<any>(`/api/rider/orders/${id}/messages`),
  sendMessage: (id: number | string, body: string) => api<any>(`/api/rider/orders/${id}/messages`, { method: 'POST', body: { body } }),
  respondLockerCode: (id: number | string, allow: boolean) => api<any>(`/api/rider/orders/${id}/locker-code`, { method: 'POST', body: { allow } }),
  cancel: (id: number | string) => api<T.OrderOut>(`/api/rider/orders/${id}/cancel`, { method: 'POST' }),
  rate: (id: number | string, rating: number, review?: string | null) =>
    api<T.OrderOut>(`/api/rider/orders/${id}/rate`, { method: 'POST', body: { rating, review: review || null } }),
  payBill: (id: number | string, b: { payment_method: T.PaymentMethod; payment_reference: string }) =>
    api<T.OrderOut>(`/api/rider/orders/${id}/pay-bill`, { method: 'POST', body: b }),
  receipt: (id: number | string) => api<any>(`/api/rider/orders/${id}/receipt`),
  bookLocker: (b: { site_id: string; locker_id?: string | null; action_type?: T.ActionType; scheduled_time?: string | null }) =>
    api<any>('/api/rider/book-locker', { method: 'POST', body: b }),
  smartSwap: (b: { latitude: number; longitude: number; max_distance_km?: number; auto_book?: boolean; scheduled_time?: string | null }) =>
    api<any>('/api/rider/smart-swap', { method: 'POST', body: b }),
  booking: (id: string) => api<any>(`/api/rider/bookings/${enc(id)}`),
  unlockBooking: (id: string, unlock_code?: string | null) =>
    api<any>(`/api/rider/bookings/${enc(id)}/unlock`, { method: 'POST', body: { unlock_code: unlock_code || null } }),
  completeBooking: (id: string) => api<any>(`/api/rider/bookings/${enc(id)}/complete`, { method: 'POST' }),
  cancelBooking: (id: string) => api<any>(`/api/rider/bookings/${enc(id)}/cancel`, { method: 'POST' }),
};

export const Guest = {
  stations: (q: { lat?: number | null; lon?: number | null; radius_km?: number } = {}) =>
    api<any>('/api/guest/stations', { query: q, auth: false }),
  plans: () => api<T.PlanOut[]>('/api/guest/plans', { auth: false }),
  quote: (b: T.QuoteRequest) => api<any>('/api/guest/quote', { method: 'POST', body: b, auth: false }),
  payAndSwap: (b: T.GuestSwapRequest) => api<any>('/api/guest/pay-and-swap', { method: 'POST', body: b, auth: false }),
};

export const Admin = {
  // sites & lockers
  sites: () => api<any>('/api/admin/sites'),
  createSite: (b: T.StationCreate) => api<any>('/api/admin/sites', { method: 'POST', body: b }),
  updateSite: (id: string, b: T.StationUpdate) => api<any>(`/api/admin/sites/${enc(id)}`, { method: 'PATCH', body: b }),
  occupancy: (q: { occupancy_status?: T.SiteAvailability | ''; include_lockers?: boolean }) =>
    api<any>('/api/admin/sites/occupancy', { query: q }),
  createLocker: (b: T.LockerCreate) => api<any>('/api/admin/lockers', { method: 'POST', body: b }),
  updateLocker: (id: string, b: T.LockerUpdate) => api<any>(`/api/admin/lockers/${enc(id)}`, { method: 'PATCH', body: b }),
  // batteries
  batteries: (q: { state?: string; station_id?: string; max_health?: number | string; limit?: number }) =>
    api<T.BatteryOut[]>('/api/admin/batteries', { query: q }),
  createBattery: (b: T.BatteryCreate) => api<T.BatteryOut>('/api/admin/batteries', { method: 'POST', body: b }),
  secondLife: () => api<T.BatteryOut[]>('/api/admin/batteries/second-life'),
  battery: (id: string) => api<T.BatteryOut>(`/api/admin/batteries/${enc(id)}`),
  setBatteryState: (id: string, b: { state: T.BatteryState; station_id?: string | null; locker_id?: string | null }) =>
    api<T.BatteryOut>(`/api/admin/batteries/${enc(id)}/state`, { method: 'PATCH', body: b }),
  chargingPlan: () => api<any>('/api/admin/charging/plan'),
  telemetryHistory: (id: string, hours = 24, limit = 1000) =>
    api<T.TelemetryOut[]>(`/api/admin/telemetry/${enc(id)}/history`, { query: { hours, limit } }),
  // pricing & plans
  pricing: () => api<T.PricingConfig>('/api/admin/pricing'),
  putPricing: (b: T.PricingConfig) => api<any>('/api/admin/pricing', { method: 'PUT', body: b }),
  profitLog: (q: { start?: string; end?: string }) => api<any>('/api/admin/profit/log', { query: q }),
  platformSettings: () => api<any>('/api/admin/platform-settings'),
  putPlatformSettings: (b: any) => api<any>('/api/admin/platform-settings', { method: 'PUT', body: b }),
  fees: () => api<any>('/api/admin/fees'),
  markFeeReceived: (id: number) => api<any>(`/api/admin/fees/${id}/received`, { method: 'POST' }),
  pricingChanges: () => api<any[]>('/api/admin/pricing/changes'),
  decidePricingChange: (id: number, b: { approve: boolean; note?: string }) => api<any>(`/api/admin/pricing/changes/${id}/decision`, { method: 'POST', body: b }),
  cancelPricingChange: (id: number) => api<any>(`/api/admin/pricing/changes/${id}/cancel`, { method: 'POST' }),
  plans: () => api<T.PlanOut[]>('/api/admin/plans'),
  createPlan: (b: T.PlanCreate) => api<T.PlanOut>('/api/admin/plans', { method: 'POST', body: b }),
  updatePlan: (code: string, b: T.PlanUpdate) => api<T.PlanOut>(`/api/admin/plans/${enc(code)}`, { method: 'PATCH', body: b }),
  // orders, payments
  orders: (q: { status?: string; station_id?: string; user_id?: number | string; limit?: number }) =>
    api<T.OrderOut[]>('/api/admin/orders', { query: q }),
  reviewOrder: (id: number, action: 'APPROVE' | 'REJECT', reason?: string) =>
    api<any>(`/api/admin/orders/${id}/review`, { method: 'POST', body: { action, reason: reason || null } }),
  payments: (q: { status?: string; limit?: number }) => api<T.PaymentOut[]>('/api/admin/payments', { query: q }),
  refund: (id: number, b: { amount_pkr?: number | null; reason?: string }) =>
    api<T.PaymentOut>(`/api/admin/payments/${id}/refund`, { method: 'POST', body: b }),
  // alerts & audit
  alerts: (q: { resolved?: boolean; type?: string; limit?: number }) => api<T.AlertOut[]>('/api/admin/alerts', { query: q }),
  ackAlert: (id: number) => api<T.AlertOut>(`/api/admin/alerts/${id}/ack`, { method: 'POST' }),
  resolveAlert: (id: number) => api<T.AlertOut>(`/api/admin/alerts/${id}/resolve`, { method: 'POST' }),
  auditLogs: (q: { action?: string; limit?: number }) => api<T.AuditOut[]>('/api/admin/audit', { query: q }),
  // fleet
  vans: () => api<T.VanOut[]>('/api/admin/vans'),
  createVan: (b: Partial<T.VanOut> & { name: string }) => api<T.VanOut>('/api/admin/vans', { method: 'POST', body: b }),
  updateVan: (id: number, b: Partial<T.VanOut>) => api<T.VanOut>(`/api/admin/vans/${id}`, { method: 'PATCH', body: b }),
  generateRoute: (van_id: number) => api<any>('/api/admin/rebalancing/plan', { method: 'POST', body: { van_id } }),
  vanTasks: (q: { status?: string; van_id?: number | string }) => api<T.VanTaskOut[]>('/api/admin/van-tasks', { query: q }),
  assignTask: (task_id: number, van_id: number) =>
    api<T.VanTaskOut>(`/api/admin/van-tasks/${task_id}/assign`, { method: 'PATCH', query: { van_id } }),
  // forecasting
  addWeather: (b: { ts?: string | null; temp_c: number; rain_mm?: number }) => api<any>('/api/admin/weather', { method: 'POST', body: b }),
  train: (prefer_xgboost: boolean) => api<any>('/api/admin/forecast/train', { method: 'POST', body: { prefer_xgboost } }),
  refreshTargets: () => api<any>('/api/admin/forecast/refresh-targets', { method: 'POST' }),
  models: () => api<any>('/api/admin/forecast/models'),
  drift: () => api<any>('/api/admin/forecast/drift'),
  pilot: (b: { n_stations?: number; days?: number; seed?: number; van_capacity?: number }) =>
    api<any>('/api/admin/pilot/run', { method: 'POST', body: b }),
  // reports
  summary: (q: { start?: string; end?: string }) => api<any>('/api/admin/reports/summary', { query: q }),
  reportLog: (q: { start?: string; end?: string }) => api<any>('/api/admin/reports/log', { query: q }),
  async revenueCsv(q: { start?: string; end?: string }): Promise<Blob> {
    const res = await api<Response>('/api/admin/reports/revenue.csv', { query: q, raw: true, headers: { Accept: 'text/csv' } });
    return res.blob();
  },
};

export const Driver = {
  me: () => api<any>('/api/driver/me'),
  tasks: (include_done = false) => api<T.VanTaskOut[]>('/api/driver/tasks', { query: { include_done } }),
  location: (latitude: number, longitude: number) =>
    api<T.VanOut>('/api/driver/location', { method: 'POST', body: { latitude, longitude } }),
  messages: (orderId: number) => api<any>(`/api/driver/orders/${orderId}/messages`),
  sendMessage: (orderId: number, body: string) => api<any>(`/api/driver/orders/${orderId}/messages`, { method: 'POST', body: { body } }),
  requestLockerCode: (orderId: number) => api<any>(`/api/driver/orders/${orderId}/locker-code/request`, { method: 'POST' }),
  confirm: (id: number, b: { delivery_otp?: string | null; confirmed_drop?: number | null; confirmed_pickup?: number | null; returned_pack_id?: string | null }) =>
    api<T.VanTaskOut>(`/api/driver/tasks/${id}/confirm`, { method: 'POST', body: b }),
  returnToDepot: () => api<any>('/api/driver/return-to-depot', { method: 'POST' }),
};

export const Telemetry = {
  ingest: (b: T.TelemetryIn, deviceKey?: string) =>
    api<any>('/api/telemetry/ingest', { method: 'POST', body: b, headers: deviceKey ? { 'x-device-key': deviceKey } : {} }),
  latest: (id: string) => api<T.BatteryOut>(`/api/telemetry/${enc(id)}/latest`),
};

export const System = {
  live: () => api<any>('/health/live', { auth: false }),
  ready: () => api<any>('/health/ready', { auth: false }),
};

/** Helpers for untyped station/site payloads. */
export const stationId = (s: any): string => String(s?.id ?? s?.station_id ?? s?.site_id ?? '');
export const stationName = (s: any): string => String(s?.name ?? s?.station_name ?? stationId(s));

export function downloadUrl(path: string, q?: Record<string, unknown>) {
  return `${API_BASE}${path}${qs(q)}`;
}
export { getTokens };
