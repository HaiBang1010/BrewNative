/**
 * TEMPORARY sample data so the skeleton screens have something to link to.
 * Replaced by GET /api/menu and GET /api/orders when the app talks to the backend.
 */

export type MockProduct = { id: string; name: string; price: number };
export type MockOrder = { id: string; code: string; status: string; total: number };

export const MOCK_PRODUCTS: MockProduct[] = [
  { id: 'ca-phe-sua-da', name: 'Cà phê sữa đá', price: 29_000 },
  { id: 'bac-xiu', name: 'Bạc xỉu', price: 35_000 },
  { id: 'tra-dao-cam-sa', name: 'Trà đào cam sả', price: 45_000 },
  { id: 'croissant-bo', name: 'Croissant bơ', price: 35_000 },
];

export const MOCK_ORDERS: MockOrder[] = [
  { id: 'demo-1', code: 'BRW-1001', status: 'preparing', total: 74_000 },
  { id: 'demo-2', code: 'BRW-1000', status: 'completed', total: 45_000 },
];

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}₫`;
}
