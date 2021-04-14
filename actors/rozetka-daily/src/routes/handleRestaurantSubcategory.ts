import Apify from 'apify';
import { LABELS } from '../consts';

const {
    utils: { log },
} = Apify;
const { PRODUCT_LIST } = LABELS;

export const handleRestaurantSubcategory = async ({
    $,
    request: { loadedUrl },
    crawler: { requestQueue },
}: Apify.CheerioHandlePageInputs): Promise<void> => {
    log.debug('Entered Category page.');

    const input = await Apify.getInput();
    const {
        maxSubcategories = undefined,
    } = typeof input === 'object' ? input : {};
    await Apify.utils.enqueueLinks({
        $,
        requestQueue,
        baseUrl: loadedUrl,
        selector: 'li.portal-grid__cell a',
        transformRequestFunction: (req) => {
            req.userData = {
                label: PRODUCT_LIST,
                longCategory: true,
            }
            return req;
        },
        // TODO: delete this for prod
        limit: maxSubcategories
    });
};
