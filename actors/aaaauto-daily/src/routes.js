const Apify = require("apify");
const randomUA = require("modern-random-ua");
const { URL } = require("url");
const tools = require("./tools");
const { LABELS, COUNTRY_TYPE, HEADER, BASE_URL } = require("./const");

exports.START = async ({ $ }, { requestQueue, country }) => {
  const pages = $("nav.pagenav li");
  const lastPage = pages
    .eq(pages.length - 2)
    .find("a")
    .text()
    .trim();
  await Array.from({ length: lastPage }, (_value, index) => index + 2).map(
    async pageNumber => {
      await requestQueue.addRequest({
        url: BASE_URL(country, pageNumber),
        headers: { ...HEADER, "User-Agent": randomUA.generate() },
        userData: { label: LABELS.PAGE, pageNumber }
      });
    }
  );
};

exports.PAGE = async ({ $ }, { country, rootUrl }) => {
  const offers = $(".card").toArray();
  const data = [];
  for (const offer of offers) {
    const $offer = $(offer);
    const link = $offer.find("a.fullSizeLink").attr("href");
    const figure = $offer.find("figure");
    const url = new URL(link, rootUrl);
    const itemId = url.searchParams.get("id");
    const itemName = $offer.find("h2 a").text().trim();
    const arr = itemName.split(",");

    const currentPrice = $offer
      .find("span[id*=garageHeart]")
      .attr("data-price");
    const actionPrice = tools.extractPrice(
      $offer.find(".carPrice h3.error:not(.hide)").text()
    );
    let originalPrice = $offer
      .find(".carPrice .darkGreyAlt")
      .find(".hix")
      .remove();
    originalPrice = tools.extractPrice($offer.find(".carFeatures p").text());

    const description = $offer.find(".carFeatures p").text().trim();
    const carFeatures = $offer
      .find(".carFeaturesList li")
      .toArray()
      .map(feature => {
        return $(feature).text();
      });

    const [km, transmission, fuelType, engine] = carFeatures;

    data.push({
      itemUrl: link,
      itemId,
      description,
      img: figure.length > 0 ? figure.find("img").attr("src") : null,
      itemName: arr[0],
      currentPrice,
      originalPrice,
      currency: country === COUNTRY_TYPE.CZ ? "Kč" : "Eur",
      actionPrice,
      discounted: !!originalPrice,
      year: arr[1] ? arr[1] : undefined,
      km,
      transmission,
      fuelType,
      engine
    });
    await Apify.utils.sleep(tools.getHumanDelayMillis(250, 950));
  }

  await Apify.pushData(data);
};
