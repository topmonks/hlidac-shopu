export const BASE_URL = 'https://www.autoesa.cz';
export const BASE_CATEGORY = 'vsechna-auta';

export const CURRENCY = {
    CZK: 'CZK',
} as const;

export const CURRENCIES = {
    [CURRENCY.CZK]: {
        label: 'Kč',
    },
} as const;

export const LABEL = {
    START: 'START',
    PAGE: 'PAGE',
    DETAIL: 'DETAIL',
} as const;
