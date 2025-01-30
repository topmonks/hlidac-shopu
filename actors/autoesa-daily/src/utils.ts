import { ActorType } from '@hlidac-shopu/actors-common/actor-type.js';
import { parseHTML } from '@hlidac-shopu/actors-common/dom.js';
import { BASE_CATEGORY, BASE_URL } from './consts.js';

export function getRootUrl(type = ActorType.Full, category = BASE_CATEGORY) {
    return getPageUrl(1, type, category);
}

export function getPageUrl(page: number, type = ActorType.Full, category = BASE_CATEGORY) {
    const root = `${BASE_URL}/${category}/?stranka=${page}`;

    switch (type) {
        case ActorType.Full:
            return root;
        default:
            throw new Error(`Unsupported actor type ${type}`);
    }
}

export function removeHtmlEntities(str: string) {
    return str.replace(/&[#a-zA-Z0-9]+;/g, '');
}

export function extractPrice(priceStr: string) {
    if (!priceStr) return;
    priceStr = removeHtmlEntities(priceStr);
    const match = priceStr.match(/[\d*\s]*Kč/g);
    if (!match) return;

    const value = match[0].replace(/\s/g, '').replace('Kč', '').replace('€', '').replace('Cena', '');
    return parseInt(value, 10);
}

export function extractSnippet(body: string, snippetId: string): string {
    const content = JSON.parse(body);
    return content.snippets[snippetId];
}

export function extractTotalPages(body: string): number {
    const snippet = extractSnippet(body, 'snippet--paginationBottom');
    const { document } = parseHTML(snippet);
    const lastPage = document.querySelector('.dots-last a');
    return lastPage ? parseInt(lastPage.textContent.match(/\d+/)[0], 10) : 0;
}
