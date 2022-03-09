const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { CreateInvalidationCommand } = require("@aws-sdk/client-cloudfront");
/** @typedef { import("@aws-sdk/client-s3").S3Client } S3Client */
/** @typedef { import("@aws-sdk/client-cloudfront").CloudFrontClient } CloudFrontClient */
/** @typedef { import("schema-dts").Product} Product */

/**
 *
 * @param detail
 * @param priceCurrency
 * @param additionalData
 * @returns {Product}
 */
const toProduct = (detail, { priceCurrency, ...additionalData }) => ({
  "@scope": "https://schema.org/",
  "@type": "Product",
  sku: detail.itemId,
  name: detail.itemName,
  url: detail.itemUrl,
  image: detail.img,
  category: detail.category,
  offers: {
    "@type": "Offer",
    availability: `https://schema.org/${
      detail.inStock ? "InStock" : "OutOfStock"
    }`,
    price: detail.currentPrice,
    priceCurrency: detail.currency
      ? currencyToISO4217(detail.currency)
      : priceCurrency
  },
  ...additionalData
});

/**
 * @param {S3Client} s3
 * @param {string} shop
 * @param {string} fileName
 * @param {string} ext
 * @param {*} data
 * @returns {Promise<void>}
 */
async function uploadToS3(s3, shop, fileName, ext, data) {
  await s3.send(
    new PutObjectCommand({
      Bucket: "data.hlidacshopu.cz",
      Key: `products/${shop}/${fileName}.${ext}`,
      ContentType: `application/${ext}`,
      Body: JSON.stringify(data)
    })
  );
}

async function uploadToS3v2(s3, item, extraData = {}) {
  if (!item.itemUrl) {
    throw new Error("Item missing attribute itemUrl");
  }
  const { shopOrigin, itemSlug } = await import("@hlidac-shopu/lib/shops.mjs");
  return uploadToS3(
    s3,
    shopOrigin(item.itemUrl),
    itemSlug(item.itemUrl),
    "jsonld",
    toProduct(item, extraData)
  );
}

/**
 *
 * @param {CloudFrontClient} cloudfront
 * @param {string} distributionId
 * @param {string} shop
 * @returns {Promise<void>}
 */
async function invalidateCDN(cloudfront, distributionId, shop) {
  await cloudfront.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        Paths: { Items: [`/products/${shop}/*`], Quantity: 1 },
        CallerReference: new Date().getTime().toString()
      }
    })
  );
}

function currencyToISO4217(currency) {
  switch (currency.toLowerCase()) {
    case "kč":
      return "CZK";
    case "€":
      return "EUR";
    default:
      return currency;
  }
}

function cleanPriceText(priceText) {
  priceText = priceText.replace(/\s+/g, "");
  if (priceText.includes("cca")) priceText = priceText.split("cca")[1];
  const match = priceText.match(/\d+(:?[,.]\d+)?/);
  if (!match) return null;
  return match[0].replace(",", ".");
}

function cleanUnitPriceText(priceText) {
  priceText = priceText.replace(/\s+/g, "");
  if (priceText.includes("/kg")) priceText = priceText.split("/kg")[0];
  const match = priceText.match(/\d+(:?[,.]\d+)?/);
  if (!match) return null;
  return match[0].replace(",", ".");
}

module.exports = {
  toProduct,
  uploadToS3,
  uploadToS3v2,
  invalidateCDN,
  currencyToISO4217,
  cleanPriceText,
  cleanUnitPriceText
};
