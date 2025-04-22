export interface Product {
  shop: string | null;
  shopOrigin: string;
  slug: string;
  itemId: string;
  itemName: string;
  itemUrl: string;
  img: string;
  currentPrice: number | null;
  originalPrice: number | null;
  currency: string;
  discounted: boolean;
  inStock: boolean;
  category?: string;
  useUnitPrice?: boolean;
  currentUnitPrice?: number;
  originalUnitPrice?: number;
  unit?: string;
  quantity?: number;
}
