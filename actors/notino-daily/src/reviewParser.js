import Apify from "apify";

const { requestAsBrowser, log } = Apify.utils;

const i = {
  operationName: "getReviews",
  variables: {
    code: "LAMVEBW_AEDP10",
    orderBy: "DateTime",
    orderDesc: true,
    page: 1,
    pageSize: 5
  },
  query:
    "query getReviews($page: Int!, $pageSize: Int!, $orderDesc: Boolean!, $orderBy: ReviewOrderBy!, $code: String!) {\n  reviews(page: $page, pageSize: $pageSize, orderDesc: $orderDesc, orderBy: $orderBy, code: $code) {\n    id\n    text\n    userName\n    score\n    createdDate\n    like\n    dislike\n    alreadyLiked\n    alreadyDisliked\n    __typename\n  }\n}\n"
};

async function getReviewPage({ sku, token, page, proxyConfiguration }) {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.80 Safari/537.36",
    // Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    authorization: `Bearer ${token}`
    // 'Accept-Encoding': 'gzip, deflate, br',
    // 'Content-Type': 'application/json',
  };
  const proxyUrl = proxyConfiguration.newUrl();
  // console.log(`REVIEWS FOR itemId: ${sku}, page: ${page}, ${token}, ${proxyUrl}`);
  let response;
  try {
    const requestObject = {
      url: "https://nushop.notino.com/apiv1",
      method: "POST",
      proxyUrl,
      headers,
      json: true,
      payload: JSON.stringify({
        operationName: "getReviews",
        variables: {
          code: sku,
          orderBy: "DateTime",
          orderDesc: true,
          page,
          pageSize: 100
        },
        query:
          "query getReviews($page: Int!, $pageSize: Int!, $orderDesc: Boolean!, $orderBy: ReviewOrderBy!, $code: String!) {\n  reviews(page: $page, pageSize: $pageSize, orderDesc: $orderDesc, orderBy: $orderBy, code: $code) {\n    id\n    text\n    userName\n    score\n    createdDate\n    like\n    dislike\n    alreadyLiked\n    alreadyDisliked\n    __typename\n  }\n}\n"
      })
    };
    response = await requestAsBrowser(requestObject);
  } catch (e) {
    log.info(e.message);
  }
  console.log(response.body);
  return response.body.data.reviews;
}

export async function getReviews({ sku, token, proxyConfiguration }) {
  const reviews = [];
  for (let page = 1; 1 > 0; page += 1) {
    const reviewsRaw = await getReviewPage({
      sku,
      token,
      page,
      proxyConfiguration
    });
    if (reviewsRaw && reviewsRaw.length !== 0) {
      for (const review of reviewsRaw) {
        reviews.push(review);
      }
      log.info(
        `Found ${reviewsRaw.length}, loading more with page ${page}, ${sku}`
      );
      await Apify.utils.sleep(1000);
    } else {
      break;
    }
  }
  return reviews;
}
