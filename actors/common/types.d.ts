export interface Product {
  shop: string;
  shopOrigin: string;
  slug: string;
  itemId: string;
  itemName: string;
  itemUrl: string;
  img: string;
  currentPrice: number;
  originalPrice: number;
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
