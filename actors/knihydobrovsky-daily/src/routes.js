const Apify = require('apify');

const { utils: { log } } = Apify;

const completeUrl = (x) => `https://www.knihydobrovsky.cz${x}`;

exports.handleStart = async ({ request, $ }) => {
    const requestQueue = await Apify.openRequestQueue();
    const links = $('#main div.row-main li a').not('div:contains("Magnesia Litera")')
        .map(function () { return $(this).attr('href'); }).get()
            .filter((x) => !x.includes('magnesia-litera') && !x.includes('velky-knizni-ctvrtek') && !x.includes('knihomanie'));
    const absoluteLinks = links.map((x) => completeUrl(x));
    for (const link of absoluteLinks) {
        await requestQueue.addRequest({ url: link, userData: { label: 'LIST' } });
    }
};

exports.handleSubList = async ({ request, $ }) => { 
    const requestQueue = await Apify.openRequestQueue();
    // if there are more subcategories enque urls...
    if ($('#bookGenres').text()) {
        const links = $('#bookGenres').next('nav').find('a').map(function () { return $(this).attr('href'); })
            .get();
        const absoluteLinks = links.map((x) => completeUrl(x));
        for (const link of absoluteLinks) {
            await requestQueue.addRequest({ url: link, userData: { label: 'SUBLIST' } });
        }
    // otherwise put this page to queue as LIST page
    } else {
        await requestQueue.addRequest({ url: request.url, uniqueKey: `${request.url}?currentPage=1`, userData: { label: 'LIST' } });
    }
};

exports.handleList = async ({ request, $ }) => {
    // Handle pagination
    const requestQueue = await Apify.openRequestQueue();
    const nextPageUrl = $('span:contains("Další")').parent('a').attr('href')
        && completeUrl($('span:contains("Další")').parent('a').attr('href').trim());
    if (nextPageUrl) {
        await requestQueue.addRequest({ url: nextPageUrl, userData: { label: 'LIST' } });
    }

    // Handle items
    const result = [];
    const category = $('#menu-breadcrumb a').map(function () { return $(this).text(); }).get().slice(1);
    category.push($('#menu-breadcrumb span').next('strong').text());

    $('li[data-productinfo]').each(function () {
        const item = {};
        item.itemId = $('h3 a', this).attr('href').split('-').slice(-1)
            .pop();
        item.img = $('picture img', this).attr('src');
        item.itemUrl = completeUrl($('h3 a', this).attr('href'));
        item.itemName = $('span.name', this).text();
        item.currentPrice = parseInt($('p.price strong', this).text(), 10);
        item.originalPrice = parseInt($('p.price span.price-strike', this).text(), 10);
        item.discounted = item.currentPrice < item.originalPrice;
        if (!item.discounted) item.originalPrice = null;
        item.rating = parseFloat($('span.stars.small span', this).attr('style').split('width: ')[1]);
        item.category = category;
        item.currency = 'CZK';
        item.inStock = $('a.buy-now', this).text().includes('Do košíku');
        result.push(item);
    });

    await Apify.pushData(result);
};