import { LABELS, CHARACTERISTICS_PATH } from '../consts.js';

export const handleProductOverview = async ({
    $,
    request: { loadedUrl },
    crawler: { requestQueue },
}) => {
    const image = [$('.product-photo__picture').attr('src')?.trim()];
    const smallImagesArr = $('.product-thumbnails__picture').toArray()
        .map((el) => $(el).attr('src')).slice(1);
    image.push(...smallImagesArr);

    await requestQueue.addRequest({
        url: new URL(CHARACTERISTICS_PATH, loadedUrl).href,
        userData: { image, label: LABELS.DETAIL },
    });
};
