const Apify = require('apify');

const { utils: { log } } = Apify;

const completeUrl = (x) => `https://www.knihydobrovsky.cz${x}`;

exports.handleStart = async ({ request, $ }, requestQueue) => {
    const links = $('#main div.row-main li a').not('div:contains("Magnesia Litera")')
        .map(function () { return $(this).attr('href'); }).get()
            .filter((x) => !x.includes('magnesia-litera') && !x.includes('velky-knizni-ctvrtek') && !x.includes('knihomanie'));
    const absoluteLinks = links.map((x) => completeUrl(x));
    for (const link of absoluteLinks) {
        await requestQueue.addRequest({ url: link, userData: { label: 'LIST' } });
    }
};

exports.handleSubList = async ({ request, $ }, requestQueue) => {
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
const getCategoryKey = ($) => {
    const category = $('#menu-breadcrumb a').map(function () { return $(this).text(); }).get().slice(1)
    category.push($('#menu-breadcrumb').find('strong').last().text());
    return category.join('|');
};
const getNumberOfProducts = ($) => $('li[data-productinfo]').get().length;

exports.handleList = async ({ request, $ }, categoryCount,requestQueue) => {
    // Handle pagination
    const lastText = $('#snippet-categoryBookList-pagination-change-page').find('a').last().next()
        .text()
        .trim();
    if (lastText) {
        const maxPageNumber = parseInt(lastText, 10);
        //doesnt work because website always show full last page
        //categoryCount[getCategoryKey($)] = (maxPageNumber - 1) * 22 + getNumberOfProducts($);
        //let add  11 as average number...
        categoryCount[getCategoryKey($)] = (maxPageNumber - 1) * 22 + 11;
    } else {
        const href = $('#snippet-categoryBookList-pagination-change-page p.r').find('a').not('a:contains(Další)').last()
            .attr('href');
        // one page only
        if (!href) {
            categoryCount[getCategoryKey($)] = getNumberOfProducts($);
        } else {
            // go next max page
            const hrefTrimmed = href.trim();
            await requestQueue.addRequest({ url: completeUrl(hrefTrimmed), userData: { label: 'LIST' } });
        }
    }
};