import Apify from 'apify';
import { enqueueLastPage } from '../helpers.js';
import { getOrIncStatsValue } from '../../tools.js';
import { MAX_PAGE_COUNT,
    BAD_HARDWARE_PAGE_URL, GOOD_HARDWARE_PAGE_URL } from '../../consts.js';

const {
    utils: { log },
} = Apify;

export const countProductsOrSplitPriceRange = async ($, url, requestQueue, userData) => {
    if (!$('.pagination').length
        || !$('.pagination__direction_type_forward[href]').length) {
        await getOrIncStatsValue($('.catalog-grid__cell').length, url);
        return;
    }

    const minPrice = parseInt($('input.slider-filter__input[formcontrolname="min"]')
        .attr('value'), 10);
    const maxPrice = parseInt($('input.slider-filter__input[formcontrolname="max"]')
        .attr('value'), 10);

    // count products from all pages except the last one (60 pr./page)
    const pagesCount = parseInt($('li.pagination__item:last-child').text(), 10);
    if (pagesCount < MAX_PAGE_COUNT || minPrice === maxPrice) {
        await enqueueLastPage($, url, requestQueue, userData);
        await getOrIncStatsValue((pagesCount - 1) * 60, url);
        return;
    }

    await splitPriceRangeToTwoRequest(url, minPrice, maxPrice, requestQueue, userData);
};

async function splitPriceRangeToTwoRequest(
    url,
    minPrice,
    maxPrice,
    requestQueue,
    userData,
) {
    let baseUrl = url;
    let urlA, urlB;

    if (baseUrl === BAD_HARDWARE_PAGE_URL) baseUrl = GOOD_HARDWARE_PAGE_URL;

    if (!baseUrl.includes('price=')) {
        urlA = baseUrl + `price=${minPrice}-${Math.floor((minPrice + maxPrice) / 2)}`;
        urlB = baseUrl + `price=${Math.floor((minPrice + maxPrice) / 2) + 1}-${maxPrice}`;
    } else {
        urlA = baseUrl.replace(/(.*)price=(.*)/, `$1price=${minPrice}-${Math.floor((minPrice + maxPrice) / 2)}`);
        urlB = baseUrl.replace(/(.*)price=(.*)/, `$1price=${Math.floor((minPrice + maxPrice) / 2) + 1}-${maxPrice}`);
    }

    await requestQueue.addRequest({
        url: urlA,
        userData,
    })
    await requestQueue.addRequest({
        url: urlB,
        userData,
    })
}
