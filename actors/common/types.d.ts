export interface Product {
  slug: string;
  itemId: string;
  itemName: string;
  itemUrl: string;
  img: string;
  currentPrice: number;
  originalPrice: number;
  currency: string;
  category?: string;
  discounted: boolean;
  inStock: boolean;
}
