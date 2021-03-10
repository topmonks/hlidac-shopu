const Apify = require("apify");

const {
  utils: { log }
} = Apify;

async function uploadToKeboola(tableName) {
  /** @type {ApifyEnv} */
  const env = await Apify.getEnv();
  /** @type {ActorRun} */
  const run = await Apify.call(
    "blackfriday/uploader",
    {
      datasetId: env.defaultDatasetId,
      upload: true,
      actRunId: env.actorRunId,
      tableName
    },
    {
      waitSecs: 25
    }
  );
  log.info(`Keboola upload called: ${run.id}`);
}

Apify.main(async () => {
  const input = await Apify.getInput();

  //Inicializace hodnot z INPUTU
  const { development, country = "cz", extensions = [] } = input || {};

  const proxyConfigurationOptions =
    input && input.proxyConfiguration
      ? input.proxyConfiguration
      : {
          groups: ["CZECH_LUMINATI"]
        };
  const maxConcurrency =
    input && input.maxConcurrency ? input.maxConcurrency : 10;
  const { startUrls } = Apify.isAtHome()
    ? input
    : {
        startUrls: [
          "https://www.knihydobrovsky.cz/kniha/udoli-295213980",
          "https://www.knihydobrovsky.cz/kniha/kralovstvi-276784328"
        ]
      };
  const requestList = await Apify.openRequestList("start-urls", startUrls, {
    persistStateKey: "listKey"
  });

  const proxyConfiguration = await Apify.createProxyConfiguration({
    useApifyProxy: !development,
    ...proxyConfigurationOptions
  });

  const crawler = new Apify.CheerioCrawler({
    requestList,
    proxyConfiguration,
    // Be nice to the websites.
    // Remove to unleash full power.
    maxConcurrency,
    handlePageFunction: async context => {
      const {
        $,
        request: { url }
      } = context;
      log.info("Page opened.", { url });
      const result = {};
      result.url = url;
      result.name = $("span[itemprop=name]").text();
      result.author = $("p.h2.author").text().trim();
      result.annotation = $("div.box-annot p").not("p.box-share").text().trim();
      result.nakladatel = $('dt:contains("Nakladatel")').next().text().trim();
      result.datumVydani = $('dt:contains("datum vydání")')
        .next()
        .text()
        .trim();
      result.isbn = $('dt:contains("isbn")').next().text().trim();
      result.ean = $('dt:contains("ean")').next().text().trim();
      result.jazyk = $('dt:contains("Jazyk")').next().text().trim();
      result.pocetStran = $('dt:contains("Počet stran")').next().text().trim();
      result.vazba = $('dt:contains("Vazba")').next().text().trim();
      result.ean = $('dt:contains("ean")').next().text().trim();
      result.category = $("#menu-breadcrumb a")
        .map(function () {
          return $(this).text();
        })
        .get()
        .slice(1);
      await Apify.pushData(result);
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");

  if (!development) {
    try {
      await uploadToKeboola("knihydobrovsky_detail");
      log.info("upload to Keboola finished");
    } catch (err) {
      log.warning("upload to Keboola failed");
      log.error(err);
    }
  }
});
