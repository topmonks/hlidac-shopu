import Apify from 'apify';
import { LABELS, START_REQUESTS } from './consts'
import { handleMainPage, handleCategory, handleProductList,
         handleRestaurantCategory, handleRestaurantSubcategory,
         handleClothesCategory } from './routes'

const { MAIN_PAGE, CATEGORY, PRODUCT_LIST,
        RESTAURANT_CATEGORY, RESTAURANT_SUBCATEGORY,
        CLOTHES_CATEGORY } = LABELS;

const {
    utils: { log },
} = Apify;

Apify.main(async () => {
    const input = await Apify.getInput();
    const {
        maxConcurrency = 100,
        proxyCountryCode,
        maxRequestsPerCrawl,
    } = typeof input === 'object' ? input : {
        proxyCountryCode: undefined,
        maxRequestsPerCrawl: undefined,
    };

    const requestList = await Apify.openRequestList('start-url', START_REQUESTS);
    const requestQueue = await Apify.openRequestQueue();
    const proxyConfiguration = await Apify.createProxyConfiguration({
        countryCode: proxyCountryCode,
    });

    const crawler = new Apify.CheerioCrawler({
        requestList,
        requestQueue,
        proxyConfiguration,
        useSessionPool: true,
        persistCookiesPerSession: true,
        maxRequestRetries: 5,
        handlePageTimeoutSecs: 120,
        requestTimeoutSecs: 120,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        autoscaledPoolOptions: {
            maxConcurrency,
        },
        maxRequestsPerCrawl,
        handlePageFunction: async (context) => {
            const { request } = context;
            const { url, userData } = request;

            const { label } = userData;
            log.info('Page opened.', { label, url });
            switch (label) {
                case MAIN_PAGE:
                    await handleMainPage(context);
                    break;
                case CATEGORY:
                    await handleCategory(context);
                    break;
                case PRODUCT_LIST:
                    await handleProductList(context);
                    break;
                case RESTAURANT_CATEGORY:
                    await handleRestaurantCategory(context);
                    break;
                case RESTAURANT_SUBCATEGORY:
                    await handleRestaurantSubcategory(context);
                    break;
                case CLOTHES_CATEGORY:
                    await handleClothesCategory(context);
                    break;

                default:
                    break;
            }
        },
        handleFailedRequestFunction: async ({ request }): Promise<void> => {
            const debugDataSet = await Apify.openDataset('debug-rozetka-daily');
            await debugDataSet.pushData({
                '#debug': Apify.utils.createRequestDebugInfo(request),
            });
        },
    });

    log.info('Starting the crawl.');
    await crawler.run();
    log.info('Crawl finished.');
});
