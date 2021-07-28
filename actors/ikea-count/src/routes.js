const Apify = require('apify');

const { getSubcategoriesUrls } = require('./utils');

const { utils: { log } } = Apify;

exports.handleCategory = async ({ request, $ }) => {
    // If category contains subcategories then don't add it to requestQueue
    // subcategories were already added in request queue
    const subcategories = getSubcategoriesUrls($);
    log.info(`[CATEGORY]: found ${subcategories.length} subcategories --- ${request.url}`);
    if (subcategories.length === 0) {
        try {
            const dataCategory = JSON.parse($("div[class='js-product-list']")
                .eq(0)
                .attr('data-category'));
            log.info(`[CATEGORY]: found ${dataCategory.totalCount} products --- ${request.url}`);
            return parseInt(dataCategory.totalCount, 10);
        } catch (e) {
            log.info(`[CATEGORY]: Category does not contain any products --- ${request.url}`);
            return 0;
        }
    }
    return 0;
};
