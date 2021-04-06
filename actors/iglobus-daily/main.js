const Apify = require('apify');
const { handleStart, handleList, handleDetail } = require('./routes');

const {
    utils: { log },
} = Apify;

Apify.main(async () => {
    const requestQueue = await Apify.openRequestQueue();

    const proxyConfiguration = await Apify.createProxyConfiguration({
        groups: ['CZECH_LUMINATI'], // List of Apify Proxy groups
        countryCode: 'CZ',
    });

    await requestQueue.addRequest({ url: 'https://www.iglobus.cz' });
    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        useApifyProxy: true,
        proxyConfiguration,
        useSessionPool: true,
        persistCookiesPerSession: false,
        maxConcurrency: 50,

        handlePageFunction: async (context) => {
            const {
                url,
                userData: { label },
            } = context.request;
            log.info('Page opened.', { label, url });
            switch (label) {
                case 'LIST':
                    return handleList(context);
                case 'DETAIL':
                    return handleDetail(context);
                default:
                    return handleStart(context);
            }
        },
    });

    log.info('Starting the crawl.');
    await crawler.run();
    log.info('Crawl finished.');

    // stats page
    try {
        const env = await Apify.getEnv();
        const run = await Apify.callTask(
            'blackfriday/status-page-store',
            {
                datasetId: env.defaultDatasetId,
                name: 'globus-cz',
            },
            {
                waitSecs: 25,
            },
        );
        console.log(`Keboola upload called: ${run.id}`);
    } catch (e) {
        console.log(e);
    }

    try {
        const env = await Apify.getEnv();
        const run = await Apify.call(
            'blackfriday/uploader',
            {
                datasetId: env.defaultDatasetId,
                upload: true,
                actRunId: env.actorRunId,
                tableName: 'globus_cz',
            },
            {
                waitSecs: 25,
            },
        );
        console.log(`Keboola upload called: ${run.id}`);
    } catch (e) {
        console.log(e);
    }
    console.log('Finished.');
});
