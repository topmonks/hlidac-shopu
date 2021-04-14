export interface InputType {
    maxConcurrency?: number,
    proxyCountryCode?: string,
    maxRequestsPerCrawl?: number,
    maxCategories?: number,
    maxSubcategories?: number,
}

export interface ProductJSONLDType {
    "@context": "http://schema.org",
    "@type": "Product",
    sku?: string, //product ID
    url?: string,
    name?: string,
    image?: string[],
    description?: string,
    itemCondition?: string,
    offers?: {
        "@type": "Offer",
        itemCondition?: string,
        availability?: string,
        url?: string,
        price?: string,
        priceCurrency?: string,
        priceValidUntil?: string,
    },
    brand?: string | {
        "@type": "Brand",
        name?: string,
        url?: string,
    },
    aggregateRating: {
        "@type": "AggregateRating",
        // ratingValue: string,
        // ratingCount: string,
    },
    category?: string,
    additionalProperty?: {
        "@type": string,
        name: string,
        value: string,
    }[],
}

export interface BreadcrumbsJSONLDType {
    "@context": "http://schema.org",
    "@type": "BreadcrumbList",
    ItemListElement: {
        "@type": "ListItem",
        position: number,
        item: {
            "@id": string,  // url
            name: string,
        }
    }[]
}

export interface DatasetItemType {
    "@context": "http://schema.org",
    "@type": "ItemPage",
    identifier?: string,
    url?: string,
    breadcrumbs?: BreadcrumbsJSONLDType,
    mainEntity?: ProductJSONLDType,
    gtin13?: string,
    mainContentOfPage?: {
        "@type": "WebPageElement",
        cssSelector?: string,
        encodingFormat?: "text/html",
        encoding?: string,
    }[]
}
