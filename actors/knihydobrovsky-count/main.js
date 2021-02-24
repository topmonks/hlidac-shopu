/**
 * This template is a production ready boilerplate for developing with `CheerioCrawler`.
 * Use this to bootstrap your projects using the most up-to-date code.
 * If you're looking for examples or want to learn more, see README.
 */

const Apify = require('apify');
const { handleStart, handleList, handleSubList, handleDetail } = require('./src/routes');

const { utils: { log } } = Apify;

async function uploadToKeboola(tableName) {
    /** @type {ApifyEnv} */
    const env = await Apify.getEnv();
    /** @type {ActorRun} */
    const run = await Apify.call(
        'blackfriday/uploader',
        {
            datasetId: env.defaultDatasetId,
            upload: true,
            actRunId: env.actorRunId,
            tableName,
        },
        {
            waitSecs: 25,
        },
    );
    log.info(`Keboola upload called: ${run.id}`);
} 

Apify.main(async () => {
    const requestQueue = await Apify.openRequestQueue();
    await requestQueue.addRequest({ url: 'https://www.knihydobrovsky.cz/kategorie' });
    await requestQueue.addRequest({ url: 'https://www.knihydobrovsky.cz/e-knihy', userData: { label: 'SUBLIST' } });
    await requestQueue.addRequest({ url: 'https://www.knihydobrovsky.cz/audioknihy', userData: { label: 'SUBLIST' } });
    await requestQueue.addRequest({ url: 'https://www.knihydobrovsky.cz/hry', userData: { label: 'SUBLIST' } });
    await requestQueue.addRequest({ url: 'https://www.knihydobrovsky.cz/papirnictvi', userData: { label: 'SUBLIST' } });
    await requestQueue.addRequest({ url: 'https://www.knihydobrovsky.cz/darky', userData: { label: 'SUBLIST' } });

    const proxyConfiguration = await Apify.createProxyConfiguration(
        {
            groups: ['RESIDENTIAL'],
            countryCode: 'CZ',
        },
    );

    const categoryCount = {};

    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        proxyConfiguration,
        // Be nice to the websites.
        // Remove to unleash full power.
        maxConcurrency: 10,
        handlePageFunction: async (context) => {
            const { url, userData: { label } } = context.request;
            log.info('Page opened.', { label, url });
            switch (label) {
                case 'LIST':
                    return handleList(context, categoryCount);
                case 'DETAIL':
                    return handleDetail(context);
                case 'SUBLIST':
                    return handleSubList(context);
                default:
                    return handleStart(context);
            }
        },
    });

    log.info('Starting the crawl.');
    await crawler.run();
    log.info('Crawl finished.');
    log.info('kategorie', categoryCount);
    const totalCount = Object.entries(categoryCount).reduce((acc, x) => acc + parseInt(x[1], 10), 1);
    await Apify.pushData({ totalCount });

    try {
        await uploadToKeboola('knihydobrovsky_count');
        log.info('upload to Keboola finished');
    } catch (err) {
        log.warning('upload to Keboola failed');
        log.error(err);
    }
});