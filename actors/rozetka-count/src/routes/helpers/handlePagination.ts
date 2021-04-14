import Apify, { RequestQueue } from 'apify';
import { UserDataType } from '../../types';

const {
    utils: { log },
} = Apify;

export const enqueueLastPage = async (
    $: cheerio.Selector,
    url: string,
    requestQueue: RequestQueue,
    userData: UserDataType,
): Promise<void> => {
    const lastPageLink = $('li.pagination__item:last-child a').attr('href');

    log.debug(`current product list page ${url} has last page ${lastPageLink}`);

    await requestQueue.addRequest({
        url: lastPageLink,
        userData,
    })
};
