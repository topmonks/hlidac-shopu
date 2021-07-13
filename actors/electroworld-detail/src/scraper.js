const Apify = require('apify');
const {utils: {log}} = Apify;

const mainBodyToken = '#snippet--pdbox';

function mkBreadcrumbsList($) {
    const categories = [];
    const categoriesArr = $('.breadcrumb__list.l-in-box.u-maw-1310px.ol--reset').children();
    categoriesArr.each((i, e) => {
        if (i > 0) {
            categories.push($(categoriesArr[i]).find('a > span').text().replace(
                new RegExp(String.fromCharCode(160), '')
            ));
        }
    });
    return categories;
}

function mkImages($) {
    const images = [];
    const imgRoot = $('#product-other-imgs').find('a');
    imgRoot.each((i, e) => {
        images.push($(e).attr('href'));
    });
    return images.slice(0, images.length - 1);
}

function stripVoteCountStr(str, ratingStr) {
    const a = [/%0A/g, /%09/g, /%97/g, /%C3/g, ratingStr + '%']
    str = encodeURIComponent(str);
    a.forEach(s => {
        str = str.replace(s, '');
    });
    str = str.substr(2);
    return str;
}

function mkRating($) {
    let ratingStr = $('.rating-stars__percents').text().trim().split('%')[0];
    let rating = -1;
    let voteCount = 0;
    if (ratingStr !== '') {
        ratingStr = ratingStr.split('%')[0];
        rating = Number(ratingStr) / 100;
        voteCount = $('.product-top__rating').text().trim();
        voteCount = stripVoteCountStr(voteCount, ratingStr);
    }
    return {value: rating, count: voteCount};
}

function mkProperty(name, value) {
    return {
        "@type": "PropertyValue",
        "name": name,
        "value": value
    };
}

function mkProperties($) {
    const properties = [];
    const baseParams = $('.product-params__main-wrap > ul').find('li');
    const otherParams = $('.ca-box').find('tbody');

    baseParams.each((i, e) => {
        const p = $(e).find('div > div');
        properties.push(mkProperty(p.find('span').text(), p.find('strong').text()));
    });

    otherParams.each((i, e) => {
        const trs = $(e).find('tr');
        trs.each((j, tr) => {
            tr = $(tr);
            properties.push(mkProperty(tr.find('th').text(), tr.find('td').text()));
        });
    });

    return properties;
}

exports.fetchPage = async ($, request, dataset) => {
    const json = JSON.parse($('#snippet-productRichSnippet-richSnippet').html());

    const rating = mkRating($);
    const images = mkImages($);
    if (images.length === 0) {
        images.push(json['offers']['image']);
    }

    await dataset.pushData({
        "@context": "http://schema.org",
        "@type": "itemPage",
        "identifier": json['identifier'],
        "url": request.url,
        "breadcrumbs": {
            "@context": "http://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": mkBreadcrumbsList($),
        },
        "mainEntity": {
            "@context": "http://schema.org",
            "@type": "Product",
            "name": json['name'],
            "description": json['description'],
            "images": images,
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": rating.value,
                "ratingCount": rating.count,
            },
            "offers": {
                "@type": "Offer",
                "priceCurrency": json['offers']['priceCurrency'],
                "price": json['price'],
                "url": json['offers']['url'],
                "itemCondition": "http://schema.org/NewCondition",
                "availability": "http://schema.org/InStock"
            },
            "brand": json['brand']['name'],
            "sku": json['sku'],
            "mpn": null,
            "gtin13": json['gtin13'],
            "category": json['offers']['category'],
            "additionalProperty": mkProperties($),
            "mainContentOfPage": [{
                "@type": "WebPageElement",
                "cssSelector": mainBodyToken,
                "encodingFormat": "text/html",
                "encoding": $(mainBodyToken).html(),
            }],
        }
    });
}
