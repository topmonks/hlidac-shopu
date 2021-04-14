import Apify from 'apify';
import { LABELS } from './consts';
import { handleProductDetails, handleProductOverview } from './routes';

const {
    utils: { log },
} = Apify;

const { OVERVIEW, DETAIL } = LABELS;

Apify.main(async () => {
    const input = await Apify.getInput();
    const {
        maxConcurrency = 100,
        proxyCountryCode = undefined,
        startUrls = [],
    } = typeof input === 'object' ? input : {};

    const requestList = await Apify.openRequestList('start-url', startUrls
        .map(request => ({ ...request, userData: { label: OVERVIEW }})));
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
        handlePageFunction: async (context) => {
            const { request: { url, userData: { label } } } = context;

            log.info('Page opened.', { url });
            switch (label) {
                case OVERVIEW: {
                    handleProductOverview(context);
                    break;
                };
                case DETAIL: {
                    handleProductDetails(context);
                    break;
                }

                default: {
                    throw new Error(`Unexpected label: ${label}`);
                }
            }
        },
        handleFailedRequestFunction: async ({ request }): Promise<void> => {
            const debugDataSet = await Apify.openDataset('debug-rozetka-info');
            await debugDataSet.pushData({
                '#debug': Apify.utils.createRequestDebugInfo(request),
            });
        },
    });

    log.info('Starting the crawl.');
    await crawler.run();
    log.info('Crawl finished.');
});
