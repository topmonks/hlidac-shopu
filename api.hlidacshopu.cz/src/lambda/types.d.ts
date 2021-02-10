export interface DataRow {
  currentPrice: number | null;
  originalPrice?: number | null;
  date: Date;
}

export interface EUDiscount {
  minPrice: number;
  currentPrice: number;
  realDiscount: number;
  lastDiscountDate: Date;
  lastIncreaseDate: Date;
  type: string;
}

export interface CommonPriceDifference {
  commonPrice: number;
  currentPrice: number;
  realDiscount: number;
  lastDiscountDate: Date;
  lastIncreaseDate: Date;
  type: string;
}
