export interface ShopDefinition {
  name: string;
  currency: string;
  logo: string;
  url: string;
  viewBox: string;
  parse(url: URL): UrlParseResult;
}

export interface ShopParams {
  url: string | undefined;
  itemId: string | undefined;
  currentPrice: string | undefined;
  originalPrice: string | undefined;
  imageUrl: string | undefined;
  title: string | undefined;
  api: string | undefined;
}

export interface UrlParseResult {
  itemUrl: string;
  itemId: string | null;
}

export interface ItemDetails {
  key: string;
  currency: string;
  title: string;
  itemId: string | null;
  itemUrl: string;
}
