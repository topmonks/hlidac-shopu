import Apify from 'apify';
import { LABELS, CHARACTERISTICS_PATH } from '../consts';

const {
    utils: { log },
} = Apify;

export const handleProductOverview = async ({
    $,
    request: { loadedUrl },
    crawler: { requestQueue },
}: Apify.CheerioHandlePageInputs): Promise<void> => {
    const image = [$('.product-photo__picture').attr('src')?.trim()];
    const smallImagesArr = $('.product-thumbnails__picture').toArray()
        .map((el) => $(el).attr('src')).slice(1);
    image.push(...smallImagesArr);

    await requestQueue.addRequest({
        url: loadedUrl[loadedUrl.length -1] === '/'
            ?  loadedUrl + CHARACTERISTICS_PATH : loadedUrl + '/' + CHARACTERISTICS_PATH,
        userData: { image, label: LABELS.DETAIL },
    })
};
