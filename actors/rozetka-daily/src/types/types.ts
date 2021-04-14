export interface InputType {
    maxConcurrency?: number,
    proxyCountryCode?: string,
    maxRequestsPerCrawl?: number,
    maxCategories?: number,
    maxSubcategories?: number,
}

export interface UserDataType {
    label?: string,
    category?: string[],
    longCategory?: true,
}

export interface DatasetItemType {
    category: string[]
    currency: string,
    inStock: boolean,
    itemName: string,
    itemId: string,
    itemUrl: string,
    itemImg: string,
    currentPrice: number,
    originalPrice?: number,
    rating?: string,
    discounted?: boolean,
    sale?: number,
}
