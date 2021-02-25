// This is the main Node.js source code file of your actor.

// Import Apify SDK. For more information, see https://sdk.apify.com/
const Apify = require('apify');

const { log } = Apify.utils;

/**
 *  @param {CheerioHandlePageInputs} context
 *  @returns {Promise<void>}
 */
const parseData = async (context) => {

    const { request, response, json, $, body } = context;
    const { id, url, type } = request.userData;
    const result = await Apify.getValue(id) || {};
    log.info(`Processing ${request.url}...`);
    log.info(`   \`${type}\` response length: ${body.length}`);

    //Check for valid response status code
    if (response.statusCode !== 200) {
        log.info('Status code:', response.statusCode);
        return;
    }

    switch (type) {
        case 'html':
            await Apify.setValue(id, { ...result, ...parseHtmlData($) });
            break;
        case 'api':
            //await Apify.setValue(id, { ...result, ...parseApiData(json, url) });
            break;
        case 'hlidac-shopu':
            //await Apify.setValue(id, { ...result, ...parseHlidacShopuData(json) });
            break;
        default:
            break;
    }

};

/**
 * @param breadcrumbs
 * @returns {object}
 */
const parseBreadcrumbs = (breadcrumbs) => ({
    itemListElement: breadcrumbs
        .map((element, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
                '@id': `https://www.tsbohemia.cz/${element.url_key.replace(/\//g, '')}`,
                name: element.title,
            },
        })),
});

/**
 * @param $
 * @returns {object}
 */
const parseHtmlData = ($) => {
  const data = {};
  //breadcrumb
  let breadcrumbs = $('#stoitem_detail .navbar');
  breadcrumbs = breadcrumbs.find('a').map((index, element) => ({
    url_key: $(element)
      .attr('href'),
    title: $(element)
      .text(),
  }))
    .get()
    .filter(item => item.url_key.includes(".html"));
  data.breadcrumbs = parseBreadcrumbs(breadcrumbs).itemListElement;

  //Najít script s funkcí, která pushuje do JSON objectu dataLayer obsah
  const script = $('#stoitem_detail>script[type="text/javascript"]').html().trim();
  if (script.includes("fillDatalayer")) {
    //Definovat proměnou dataLayer, do které rekonstruovaná funkce pushne data
    var dataLayer = [];
    //Rekonstruovat a zavolat funkci, aby jsme json získaly data
    eval("var restoredDataLayerFunction = " +script);
    restoredDataLayerFunction();
    dataLayer = dataLayer[0].ecommerce.detail.products[0];
  }

  /*
        "@context": "http://schema.org",
        "@type": "Product"
  */

  //Product name
  data.name = dataLayer.name;

  //Product description
  let shortDescription = $('#stoitem_detail tr.shortnote');
  let longDescription = $('#stoitem_detail div.stoitemnote');
  //Check type of product description template
  if (longDescription.find('div#produkt-popisek').length) {
    longDescription = longDescription.find('div#produkt-popisek').text();
    longDescription = longDescription.split('\r\n').filter(line => line.length > 0).join(' ');
  } else {
    longDescription = longDescription.find('p').last().text();
  }

  data.description = shortDescription.find('th').text();
  data.description += "\n";
  data.description += longDescription;

  //Thumbnail
  let thumbnailImage = $('div#sti_bigimg').find('a')
    .toArray()
    .map(element => $(element).attr('href'));

  data.thumbnailUrl = thumbnailImage;
  //Images
  let productImages = $('ul#stigalleryul').find('a')
    .toArray()
    .map(element => $(element).attr('href'));

  data.image = thumbnailImage.concat(productImages);

  //Product brand
  data.brand = dataLayer.brand;

  //Offer
  //Availability
  data.offers = { '@type': 'Offer',
    availability: "",
    itemCondition: "",
    price: dataLayer.price,
    priceCurrency: "CZK",
  }



};



const parseHtmlData2 = ($) => {
    const data = {};
    //PropertyValue
    let propertyValues = $('div#id-attributes table.list').find('tr').map((index, element) => {
        const pLabel = $('td:first-child span:last-child', element).text().trim();
        const pValue = $('td:last-child span.value', element).text().trim();
        if(pValue.length > 0){
            return { '@type': 'PropertyValue', name: pLabel, value: pValue }
        }
    })
    .get();

    data.properties = propertyValues;

    //Offer
    //Availability
    data.offers = { '@type': 'Offer',
        availability: $('span[itemprop="availability"]').attr('content'),
        itemCondition: $('span[itemprop="condition"]').attr('content'),
        price: $('span[itemprop="price"]').attr('content'),
        priceCurrency: $('span[itemprop="priceCurrency"]').attr('content'),
    }



    return data;
};

/**
 * @param data
 * @returns {object}
 */
const processData = (data) => {
    //console.log(data);
    let result = {
        '@context': 'http://schema.org',
        '@type': 'ItemPage',
        identifier: data.product.id,
        url: data.product.url,
        breadcrumbs: {
            '@context': 'http://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: data.breadcrumbs,
        },
        mainEntity: {
            '@context': 'http://schema.org',
            '@type': 'Product',
            additionalProperty: data.properties,
            brand: data.brand,
            category: data.breadcrumbs ? (data.breadcrumbs.map((breadcrumb) => breadcrumb.item.name)
                .join(' > ')) : '',
            offers: data.offers,
            sku: data.product.id,
            description: data.description,
            image: data.image,
            name: data.name,
        },
        thumbnailUrl: data.thumbnailUrl,
    }
    return result;
};

/**
 * @param country
 * @returns {Promise<void>}
 */
const uploadToKeboola = async (country) => {
    try {
        /** @type {ApifyEnv} */
        const env = await Apify.getEnv();
        /** @type {ActorRun} */
        const run = await Apify.call(
            'blackfriday/uploader',
            {
                datasetId: env.defaultDatasetId,
                upload: true,
                actRunId: env.actorRunId,
                tableName: `datart_${country.toLowerCase()}_detail`,
                manualLimit: 100,
            },
            {
                waitSecs: 25,
            },
        );
        log.info(`Keboola upload called: ${run.id}`);
    } catch (err) {
        log.error(err);
    }
};

Apify.main(async () => {
    /** @type {Set<RequestOptions>} */
    const requests = new Set();

    // Get input of the actor (here only for demonstration purposes).
    const input = await Apify.getInput();
    //console.log('Input:');
    //console.dir(input);

    //Inicializace hodnot z INPUTU
    const {
        development,
        country = 'cz',
        extensions = [],
        maxConcurrency = 10,
    } = input || {};

    let { products = {} } = input || {};
    products = products
        .map((product) => ({ id: String(product.productId), ...product }))
        .filter((product) => product.id.length);
    //console.log(products);

    // Prepare requests and add them to the requestQueue.
    for (const product of products) {
        requests.add({
            url: product.url,
            userData: {
                ...product,
                type: 'html',
            },
        });
    }

    // Příprava seznamu adres ke zpracování
    const requestList = new Apify.RequestList({
        sources: [...requests],
        persistStateKey: 'tsbohemia-detail',
    });
    await requestList.initialize();

    // Create crawler.
    const crawler = new Apify.CheerioCrawler({
        requestList,
        maxConcurrency,
        maxRequestRetries: 3,
        //additionalMimeTypes: ['application/json', 'text/plain'],
        handlePageFunction: parseData,
        handleFailedRequestFunction: async ({ request }) => {
            log.error(`Request ${request.url} failed multiple times`, request);
        },
    });

    // Run crawler.
    await crawler.run();
    log.info('Crawler finished.');

    // Process and save data.
    for (const product of products) {
        await Apify.pushData(processData({
            ...await Apify.getValue(product.id),
            product,
            extensions,
        }));
    }

    // Upload to Keboola.
    if (!development) {
        await uploadToKeboola(country);
        log.info('Upload to `Keboola` finished.');
    }
});
