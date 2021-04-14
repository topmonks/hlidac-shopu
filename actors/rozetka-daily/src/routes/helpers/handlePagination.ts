import Apify, { RequestQueue } from 'apify';
import { PRODUCT_LIST_NEXT_PAGE_SELECTOR } from '../../consts'
import { UserDataType } from '../../types';

const {
    utils: { log },
} = Apify;

export const handlePagination = async (
    $: cheerio.Selector,
    url: string,
    requestQueue: RequestQueue,
    userData: UserDataType,
): Promise<void> => {
    const nextPageLink = $(PRODUCT_LIST_NEXT_PAGE_SELECTOR).attr('href');

    // case when there is a button 'next page'
    if (nextPageLink) {
        log.debug(`current product list page ${url} has next page ${nextPageLink}`);

        await requestQueue.addRequest({
            url: nextPageLink,
            userData,
        })
    }
};
