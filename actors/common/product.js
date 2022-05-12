import { PutObjectCommand } from "@aws-sdk/client-s3";
import { CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { shopOrigin, itemSlug } from "@hlidac-shopu/lib/shops.mjs";

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
export function toProduct(detail, { priceCurrency, ...additionalData }) {
  return Object.assign(
    {
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
      }
    },
    additionalData
  );
}

/**
 * @param {S3Client} s3
 * @param {string} shop
 * @param {string} fileName
 * @param {string} ext
 * @param {*} data
 * @returns {Promise<void>}
 */
async function uploadToS3(s3, shop, fileName, ext, data) {
  if (process.env.TEST) return;
  await s3.send(
    new PutObjectCommand({
      Bucket: "data.hlidacshopu.cz",
      Key: `products/${shop}/${fileName}.${ext}`,
      ContentType: `application/${ext}`,
      Body: JSON.stringify(data)
    })
  );
}

/**
 * @param {S3Client} s3
 * @param {*} item
 * @param {*} extraData
 */
export async function uploadToS3v2(s3, item, extraData = {}) {
  if (!item.itemUrl) {
    throw new Error("Item missing attribute itemUrl");
  }
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
export async function invalidateCDN(cloudfront, distributionId, shop) {
  if (process.env.TEST) return;
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

export function invalidateCDNv2(cloudfront, rootUrl) {
  return invalidateCDN(
    cloudfront,
    process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID,
    shopOrigin(rootUrl)
  );
}

export function currencyToISO4217(currency) {
  switch (currency.toLowerCase()) {
    case "kč":
      return "CZK";
    case "€":
      return "EUR";
    default:
      return currency;
  }
}

export function cleanPrice(s) {
  return parseFloat(cleanPriceText(s));
}

export function cleanPriceText(priceText) {
  let result = priceText.replace(/\s+/g, "");
  if (result.includes("cca")) {
    result = result.split("cca")[1];
  }
  const match = result.match(/\d+(:?[,.]\d+)?/);
  if (!match) return null;
  return match[0].replace(",", ".");
}

export function cleanUnitPriceText(priceText) {
  let result = priceText.replace(/\s+/g, "");
  if (result.includes("/kg")) {
    result = result.split("/kg")[0];
  }
  const match = result.match(/\d+(:?[,.]\d+)?/);
  if (!match) return null;
  return match[0].replace(",", ".");
}
