/**
 * This template is a production ready boilerplate for developing with `CheerioCrawler`.
 * Use this to bootstrap your projects using the most up-to-date code.
 * If you're looking for examples or want to learn more, see README.
 */

const Apify = require('apify');

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
    const { startUrls } = Apify.isAtHome() ? await Apify.getInput()
        : {
            startUrls: ['https://www.knihydobrovsky.cz/kniha/udoli-295213980',
                'https://www.knihydobrovsky.cz/kniha/kralovstvi-276784328',
            ],
        };
    const requestList = await Apify.openRequestList('start-urls', startUrls, { persistStateKey: 'listKey' });
    const proxyConfiguration = await Apify.createProxyConfiguration(
        {
            groups: ['RESIDENTIAL'],
            countryCode: 'CZ',
        },
    );

    const crawler = new Apify.CheerioCrawler({
        requestList,
        proxyConfiguration,
        // Be nice to the websites.
        // Remove to unleash full power.
        maxConcurrency: 10,
        handlePageFunction: async (context) => {
            const { $, request: { url } } = context;
            log.info('Page opened.', { url });
            const result = {};
            result.url = url;
            result.name = $('span[itemprop=name]').text();
            result.author = $('p.h2.author').text().trim();
            result.annotation = $('div.box-annot p').not('p.box-share').text().trim();
            result.nakladatel = $('dt:contains("Nakladatel")').next().text().trim();
            result.datumVydani = $('dt:contains("datum vydání")').next().text().trim();
            result.isbn = $('dt:contains("isbn")').next().text().trim();
            result.ean = $('dt:contains("ean")').next().text().trim();
            result.jazyk = $('dt:contains("Jazyk")').next().text().trim();
            result.pocetStran = $('dt:contains("Počet stran")').next().text().trim();
            result.vazba = $('dt:contains("Vazba")').next().text().trim();
            result.ean = $('dt:contains("ean")').next().text().trim();
            await Apify.pushData(result);
        },
    });

    log.info('Starting the crawl.');
    await crawler.run();
    log.info('Crawl finished.');

    try {
        await uploadToKeboola('knihydobrovsky_detail');
        log.info('upload to Keboola finished');
    } catch (err) {
        log.warning('upload to Keboola failed');
        log.error(err);
    } 
});
