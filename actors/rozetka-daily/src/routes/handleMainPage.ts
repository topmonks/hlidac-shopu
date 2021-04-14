import Apify from 'apify';
import { MAIN_DOMAIN, LABELS } from '../consts';

const {
    utils: { log },
} = Apify;
const { CATEGORY } = LABELS;

export const handleMainPage = async ({
    $,
    request: { loadedUrl },
    crawler: { requestQueue },
}: Apify.CheerioHandlePageInputs): Promise<void> => {
    log.info('Entered main page.');

    // TODO: delete this for prod
    const input = await Apify.getInput();
    const {
        maxCategories,
    } = typeof input === 'object' ? input : {};

    await Apify.utils.enqueueLinks({
        $,
        requestQueue,
        baseUrl: loadedUrl,
        selector: '.menu-wrapper_state_static .menu-categories__link',
        pseudoUrls: ['[.*]' + MAIN_DOMAIN + '[(?:\\w|-)*]/c[.*]', 'https://bt' + MAIN_DOMAIN + '[.*]'],
        transformRequestFunction: (req) => {
            req.userData = {
                label: CATEGORY,
            }
            return req;
        },
        // TODO: delete this for prod
        limit: maxCategories
    });
};
