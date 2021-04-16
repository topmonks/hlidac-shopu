import Apify from 'apify';
import { scrapeProducts, handlePagination } from '../helpers.js';
import { MAX_PAGE_COUNT,
    BAD_HARDWARE_PAGE_URL, GOOD_HARDWARE_PAGE_URL } from '../../consts.js';

const {
    utils: { log },
} = Apify;

export const scrapeProductsOrSplitPriceRange = async (
    $,
    url,
    requestQueue,
    userData,
) => {
    // if there's no products grid
    if (!$('ul.catalog-grid').length) return;

    // take categories from userData in case of pagination pages
    let category = (userData).category;
    if (!category) {
        const categories = [];
        $('.breadcrumbs span').each(function(i, el) {
            categories[i] = $(el).text()?.trim();
        })

        category = [
            ...categories,
            $('.catalog-heading').text()?.trim(), // subcategory name
        ];
    }

    const minPrice = parseInt($('input.slider-filter__input[formcontrolname="min"]')
        .attr('value'), 10);
    const maxPrice = parseInt($('input.slider-filter__input[formcontrolname="max"]')
        .attr('value'), 10);

    // Scrape products already if their count is less than 34 pages.
    // We also give up on splitting price ranges if minPrice already equals maxPrice.
    if (!$('.pagination').length
        || parseInt($('li.pagination__item:last-child').text(), 10) < MAX_PAGE_COUNT
        || minPrice === maxPrice) {
        await scrapeProducts($, category);
        await handlePagination($, url, requestQueue, userData);
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
