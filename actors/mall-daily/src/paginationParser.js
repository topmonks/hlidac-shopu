const { requestRetry, getHeaders } = require("./utils");

async function paginationParser(
  $,
  requestQueue,
  request,
  web,
  proxyUrl,
  stats
) {
  // try to add pagination from the script
  try {
    const paginationBlock = $("div.pagination");
    const paginationActive = paginationBlock
      .find("button.pagination__item--active")
      .text()
      .trim();
    if (paginationActive === "1") {
      // Get last pagination page
      let paginationLast = 1;
      paginationBlock.find("button.pagination__item").each(function () {
        const paginationValue = parseInt($(this).text().trim());
        if (paginationValue > paginationLast) {
          paginationLast = paginationValue;
        }
      });
      if (paginationLast > 1) {
        for (let i = 2; i <= paginationLast; i++) {
          const nextPaginationUrl = `${request.url}?pagination=${i}`;
          await requestQueue.addRequest({
            url: nextPaginationUrl,
            userData: {
              label: "PAGE"
            }
          });
          stats.pages++;
        }
        console.log(`${request.url} Adding ${paginationLast - 1} paginations`);
      }
    }
    // fuck mall, they are changing it every day, will keep both of variants here
    else if ($('script:contains("var CONFIGURATION")').length !== 0) {
      const scriptRaw = $('script:contains("var CONFIGURATION")').text();
      const pageData = JSON.parse(
        scriptRaw.split("var CONFIGURATION =")[1].split("var ")[0].trim()
      );
      if (pageData.initialApiData && pageData.initialApiData.total) {
        const paginationCount = Math.ceil(pageData.initialApiData.total / 48);
        if (paginationCount !== 0) {
          console.log(
            `Adding ${paginationCount} paginations for ${request.url}`
          );
          for (let i = 2; i <= paginationCount; i++) {
            const nextPaginationUrl = `${request.url}?page=${i}`;
            await requestQueue.addRequest({
              url: nextPaginationUrl,
              userData: {
                label: "PAGE"
              }
            });
          }
        }
      }
    } else if ($('script[src*="configuration"]').length !== 0) {
      const scriptQuery = $('script[src*="configuration"]').attr("src");
      const scriptUrl =
        scriptQuery.indexOf("https") === -1
          ? `${web}${scriptQuery}`
          : scriptQuery;
      const response = await requestRetry({
        uri: scriptUrl,
        headers: getHeaders(),
        proxy: proxyUrl
      });
      const pageData = JSON.parse(
        response
          .split("var CONFIGURATION =")[1]
          .split("var CONFIGURATION_URL = ")[0]
          .trim()
      );
      if (pageData.initialApiData && pageData.initialApiData.total) {
        const paginationCount = Math.ceil(pageData.initialApiData.total / 48);
        if (paginationCount !== 0) {
          console.log(
            `Adding ${paginationCount} paginations for ${request.url}`
          );
          for (let i = 2; i <= paginationCount; i++) {
            const nextPaginationUrl = `${request.url}?page=${i}`;
            await requestQueue.addRequest({
              url: nextPaginationUrl,
              userData: {
                label: "PAGE"
              }
            });
          }
        }
      }
    }

    if ($("a.lst-guide-item-container").length !== 0) {
      const guideUrls = [];
      $("a.lst-guide-item-container").each(function () {
        const urlRaw = $(this).attr("href");
        guideUrls.push({
          url: urlRaw.indexOf("https") === -1 ? `${web}${urlRaw}` : urlRaw,
          userData: {
            label: "PAGE"
          }
        });
      });
      for (const item of guideUrls) {
        await requestQueue.addRequest(item);
      }
    }
  } catch (e) {
    // this cant be used, keeping it here just so, it could be done by counting items from let menu by brands, but it require more work to do
    /* try {
     // fallback to the parsing of count of items from the page
       if ($('span.con-notification').length !== 0 && $('span.con-notification').text().replace(/\s+/g, '').match(/\d+/) !== null) {
           const count = parseInt($('span.con-notification').text().replace(/\s+/g, '').match(/\d+/)[0]);
           const max = Math.ceil(count / 48);
           console.log(`Adding ${max} paginations for ${request.url}`);
           for (let i = 2; i <= max; i++) {
               const nextPaginationUrl = `${request.url}?page=${i}`;
               await requestQueue.addRequest({
                   url: nextPaginationUrl,
                   userData: {
                       label: 'PAGE',

                   },
               });
           }
       }
   } catch (e) {
       throw new Error('There is not an information about count of items for category.');
   } */
    console.log(e.message);
    throw new Error(
      "There is not an information about count of items for category."
    );
  }
}

module.exports = paginationParser;
