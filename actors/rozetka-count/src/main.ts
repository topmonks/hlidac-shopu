import Apify from 'apify';
import { KeyValueStoreStatsType } from './types'
import { LABELS, START_REQUESTS, STATS_KEY } from './consts'
import { getOrIncStatsValue, migrationFlagGetOrSet } from './tools'
import { handleMainPage, handleCategory, handleProductList,
         handleRestaurantCategory, handleRestaurantSubcategory,
         handleClothesCategory } from './routes'
import { type } from 'os';

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

    /**
     * At start we check whether the key-value store has a value
     * of the STATS_KEY key (in case previous actor run migrated here)
     * and save the value as a start value for the current run.
     */
    const statsObj: unknown = await Apify.getValue(STATS_KEY);
    if (typeof statsObj === 'object' && statsObj != null) {
        const stats: KeyValueStoreStatsType = statsObj;

        log.info(`Product count start value from the store: ${stats.value}`)
        await getOrIncStatsValue(+stats.value);
    }

    // persist value on migration
    Apify.events.on('migrating', async () => {
        migrationFlagGetOrSet(true);
        const statsValue = await getOrIncStatsValue();

        log.info(`Migration: saving the value '${statsValue}' to the key-value store.`);
        await Apify.setValue(STATS_KEY, { value: statsValue });
    })

    setInterval(async () => log.info(`Shop products count: ${await getOrIncStatsValue()}`), 60000);

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
            const debugDataSet = await Apify.openDataset('debug-rozetka-count');
            await debugDataSet.pushData({
                '#debug': Apify.utils.createRequestDebugInfo(request),
            });
        },
    });

    log.info('Starting the crawl.');
    await crawler.run();
    log.info('Crawl finished.');

    await Apify.pushData({ OUTPUT: await getOrIncStatsValue() })
    await Apify.setValue(STATS_KEY, null);
});
