const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { CreateInvalidationCommand } = require("@aws-sdk/client-cloudfront");

/** @typedef { import("@aws-sdk/client-s3").S3Client } S3Client */
/** @typedef { import("@aws-sdk/client-cloudfront").CloudFrontClient } CloudFrontClient */
/** @typedef { import("schema-dts").Product} Product */

/**
 *
 * @param detail
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
    priceCurrency: currencyToISO4217(detail.currency) ?? priceCurrency
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

function currencyToISO4217(currency) {
  return currency.toLowerCase() === "kč" ? "CZK" : currency;
}

module.exports = {
  toProduct,
  uploadToS3,
  s3FileName,
  invalidateCDN
};
