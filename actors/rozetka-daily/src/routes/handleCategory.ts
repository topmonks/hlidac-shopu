import Apify from 'apify';
import { LABELS } from '../consts';

const {
    utils: { log },
} = Apify;
const { PRODUCT_LIST } = LABELS;

export const handleCategory = async ({
    $,
    request: { loadedUrl },
    crawler: { requestQueue },
}: Apify.CheerioHandlePageInputs): Promise<void> => {
    log.debug('Entered Category page.');

    await Apify.utils.enqueueLinks({
        $,
        requestQueue,
        baseUrl: loadedUrl,
        selector: '.tile-cats__heading',
        transformRequestFunction: (req) => {
            req.userData = {
                label: PRODUCT_LIST,
            }
            return req;
        },
    });
};
