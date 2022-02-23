const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { CreateInvalidationCommand } = require("@aws-sdk/client-cloudfront");
const s3 = new S3Client({ region: "eu-central-1" });
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

async function uploadToS3v2(item, { priceCurrency, ...additionalData }) {
  if (item["itemUrl"] === undefined || item["itemUrl"] === null) {
    throw new Error("Item missing attribute itemUrl");
  }
  let shop = await shopName(item.itemUrl);
  if (!shop.includes("_")) {
    shop = await shopName(item.itemUrl, { getFullKey: true });
  }
  const fileName = await s3FileName(item);
  const ext = "jsonld";
  const data = toProduct(item, { priceCurrency, ...additionalData });
  await s3.send(
    new PutObjectCommand({
      Bucket: "data.hlidacshopu.cz",
      Key: `products/${shop.replace("_", ".")}/${fileName}.${ext}`,
      ContentType: `application/${ext}`,
      Body: JSON.stringify(data)
    })
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

async function s3FileName(detail) {
  const { shops, shopName } = await import("@hlidac-shopu/lib/shops.mjs");
  const url = new URL(detail.itemUrl);
  const shop = shops.get(shopName(url));
  return shop.parse(url).itemUrl;
}

async function shopName(url, options = {}) {
  const { shopName } = await import("@hlidac-shopu/lib/shops.mjs");
  return shopName(new URL(url), options);
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
  s3FileName,
  shopName,
  invalidateCDN,
  currencyToISO4217,
  cleanPriceText,
  cleanUnitPriceText
};
