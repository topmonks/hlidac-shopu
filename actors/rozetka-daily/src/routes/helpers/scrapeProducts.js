import Apify from "apify";
import { S3Client } from "@aws-sdk/client-s3";
import { uploadToS3v2 } from "@hlidac-shopu/actors-common/product.js";
import { CURRENCY, PRODUCT_CELL_SELECTOR } from "../../consts.js";

const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });

export async function scrapeProducts($, category, stats, processedIds) {
  const products = $(PRODUCT_CELL_SELECTOR);

  // we don't need to block pushes, we will await them all at the end
  const requests = [];

  for (let i = 0; i < products.length; i++) {
    const product = scrapeOneProduct(products.eq(i), category);
    // Save data to dataset
    if (!processedIds.has(product.itemId)) {
      processedIds.add(product.itemId);
      requests.push(Apify.pushData(product), uploadToS3v2(s3, product));
      stats.items++;
    } else {
      stats.itemsDuplicity++;
    }
  }
  console.log(`Found ${requests.length / 2} unique products`);
  // await all requests, so we don't end before they end
  await Promise.allSettled(requests);
}

function scrapeOneProduct(product, category) {
  const itemId = product
    .find("[data-goods-id]")
    ?.eq(0)
    .attr("data-goods-id")
    ?.trim();
  const itemName = product
    .find(".goods-tile__heading")
    ?.eq(0)
    .attr("title")
    ?.trim();
  const itemUrl = product
    .find(".goods-tile__heading")
    ?.eq(0)
    .attr("href")
    ?.trim();
  const itemImg = product
    .find(".goods-tile__picture img")
    ?.eq(0)
    .attr("src")
    ?.trim();
  const currentPrice = product
    .find(".goods-tile__price-value")
    ?.eq(0)
    .text()
    ?.trim()
    .split(" ")
    .join("");
  const originalPrice =
    product
      .find(".goods-tile__price--old")
      ?.eq(0)
      .text()
      ?.trim()
      .match(/\d.*\d/)?.[0]
      .split(" ")
      .join("") || null;
  const discounted = !(originalPrice === null);
  const sale =
    product
      .find(".promo-label_type_action")
      .eq(0)
      .text()
      ?.trim()
      .match(/\d+/)?.[0] || undefined;
  const rating =
    product
      .find(".goods-tile__stars svg[aria-label]")
      ?.eq(0)
      .attr("aria-label")
      ?.trim()
      ?.match(/[\d|.]+/)?.[0] || undefined;

  const inStockMessageStart = product
    .find(".goods-tile__availability")
    .eq(0)
    .text()
    ?.trim()?.[0];
  const inStock = inStockMessageStart === "Є" || inStockMessageStart === "Е";

  return {
    itemId,
    itemName,
    itemUrl,
    itemImg,
    category,
    currentPrice,
    currency: CURRENCY,
    originalPrice,
    discounted,
    sale,
    rating,
    inStock
  };
}
