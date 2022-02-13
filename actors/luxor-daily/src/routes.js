const Apify = require('apify');
const { URL } = require('url');

// const { s3FileName } = require("@hlidac-shopu/actors-common/product.js");

const {
    utils: { log }
} = Apify;

const WEB_URL = `https://luxor.cz`;

exports.handleStart = async ({ request, $, requestQueue }) => {

    const { body } = await Apify.utils.requestAsBrowser({ url: 'https://mw.luxor.cz/api/v1/categories?size=100&filter%5BonlyRoot%5D=1' });

    let categories = JSON.parse(body).data;

    for(const category in categories) {
        console.log(categories[category].slug);

        const slug = categories[category].slug;

        const { body } = await Apify.utils.requestAsBrowser({
            url: 'https://mw.luxor.cz/api/v1/products?page=1&size=24&sort=revenue%3Adesc&filter%5Bcategory%5D=' + slug
        });

        const products = JSON.parse(body).data;

        console.log(products);

        for(const product in products) {
            console.log(products[product].author, products[product].title, products[product].publisher, products[product].slug)
            //console.log(products[product].sum_price[0]);
            console.log(products[product].current_variant_price_group);

            const prices = products[product].current_variant_price_group;
            for(const price in prices) {
                console.log(prices[price]);
            }
        }


        /*
        requestQueue.addRequest({
            url: `https://mw.luxor.cz/api/v1/products?page=1&size=24&sort=revenue%3Adesc&filter%5Bcategory%5D=` + slug,
            userData: {
                label: 'LIST',
                product: products[product]
            }
        });
        */

        break;
    }

    /*
    const categories = $('.fqo5ryo .fowumum');

    for (const category of categories) {
        const categoryLink = $(category).attr('href');
        console.log(categoryLink);

        const url = new URL(WEB_URL + categoryLink);

        console.log('URL', url);

        // Kategorie produktu
        // https://mw.luxor.cz/api/v1/categories?size=100&filter%5BonlyRoot%5D=1
        // .data
        // obsahuje id (806), title (Knihy), slug (knihy), parent (

        // Produkty na stránce
        // https://mw.luxor.cz/api/v1/products?page=1&size=24&sort=revenue%3Adesc&filter%5Bcategory%5D=knihy
        // .data[0]
        // id(393858), author(Karel Gott), in_stock (true), description, title(Má cesta za štěstím),
        // current_variant_price_group[0]{with_vat(1399), without_vat(1271.8181), currency(CZK), type(RECOMMENDED, SALE)}

        // Subkategorie knih
        // https://mw.luxor.cz/api/v1/categories/slug/knihy
        // .data.children
        // obsahuje id (224), title (Beletrie), slug (knihy-beletrie)

        if(url.pathname.indexOf('products') > -1) {
            await requestQueue.addRequest({
                url: url.toString(),
                userData: {
                    label: 'LIST'
                },
            });
        }
    }
    */
};

exports.handleList = async ({ request, $, requestQueue }) => {
    // Handle pagination

    //const subcategories = $('body').text();

    console.log(request);
    console.log($);

    /*
    const subcategories = $('.f1xplvo1');

    for (const subcategories of subcategory) {
        const categoryLink = $(subcategory).attr('href');
        console.log(categoryLink);

        const url = new URL(WEB_URL + categoryLink);

        console.log('URL', url);

        if (url.pathname.indexOf('products') > -1) {
            await requestQueue.addRequest({
                url: url.toString(),
                userData: {
                    label: 'LIST'
                },
            });
        }
    }
    */
};

exports.handleDetail = async ({ request, $ }, requestQueue) => {
    // Handle details
};
