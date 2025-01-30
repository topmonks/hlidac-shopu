import { ActorType } from '@hlidac-shopu/actors-common/actor-type.js';

export interface Input {
    development: boolean;
    debug: boolean;
    maxRequestRetries: number;
    type: ActorType;
    proxyGroups: string[];
}

export interface Product {
    itemUrl: string | null;
    itemId?: string | null;
    img?: string | null;
    itemName?: string;
    currentPrice?: number;
    originalPrice?: number;
    currency: string;
    discounted: boolean;
    year?: string;
    km?: string;
    power?: string;
    fuelType?: string;
}
