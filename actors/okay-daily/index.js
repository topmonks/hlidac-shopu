export function calculateTagSalePrice(productObject) {
  const productTags = productObject.tags;
  let mkt_tags_srdce = productTags.filter(
    tag => tag.indexOf("MKT:") !== -1 && tag.indexOf("❤") !== -1
  );
  let mkt_tags_hvezda = productTags.filter(
    tag =>
      (tag.indexOf(`BAD:sleva-`) !== -1 || tag.indexOf(`BAD:bez-dph`) !== -1) &&
      tag.indexOf("★") !== -1
  );

  let price, classNames, percent;
  let cashbackDiscount = 0,
    cashbackPriceText = "";

  if (productTags !== undefined) {
    mkt_tags_srdce = mkt_tags_srdce.map(srdce =>
      srdce.substring(srdce.indexOf("MKT:") + 4, srdce.lastIndexOf("❤"))
    );

    for (let srdce of mkt_tags_srdce) {
      if (srdce.indexOf(`Kč sleva s cashbackem`) !== -1) {
        cashbackDiscount = parseInt(srdce, 10);
        cashbackPriceText = `CENA s CASHBACKEM`;
      }
    }

    // vypocet, jen kdyz není sleva v kosiku

    if (mkt_tags_hvezda.length == 0) {
      let sleva_procent = 0;
      let sleva = 0;
      let cenaskodemtxt = "";

      for (let srdce of mkt_tags_srdce) {
        if (srdce.indexOf(`Kč sleva s kódem`) !== -1) {
          cenaskodemtxt = `CENA s KÓDEM`;
          sleva = parseInt(srdce, 10);
          break;
        } else if (srdce.indexOf(`% sleva s kódem`) !== -1) {
          cenaskodemtxt = `CENA s KÓDEM`;
          sleva_procent = parseInt(srdce, 10);
          break;
        }
      }

      if (cenaskodemtxt != "") {
        price = productObject.variants[0].price / 100;

        price = (price * (100 - sleva_procent)) / 100; //vypocet slevy
        if (sleva > 0) {
          price = price - sleva;
        }
        productObject.variants[0].price = price * 100;
        productObject.priceChangesBySaleTag = true;
        price = Math.round(price * 100);
        price = price.toFixed().toString().replace(".", ",");
      }
    }
  }

  //srdickové tagy - jen info - jedno srdícko  - END

  const hasBadWithoutVat = productTags.find(tag => {
    if (tag.includes("BAD:bez-dph")) {
      return true;
    }
  });

  if (hasBadWithoutVat) {
    // vypocet ceny pred dph

    price = productObject.variants[0].price / 100;

    const vatCoefficient = 1.21;
    price = price / vatCoefficient; //vypocet bez  DPH
    if (productObject.compare_at_price_max == 0) {
      productObject.compare_at_price_max = productObject.price_max;
    }
    if (productObject.compare_at_price_min == 0) {
      productObject.compare_at_price_min = productObject.price_min;
    }
    if (productObject.price_min > price) {
      productObject.price_max = price;
    }
    productObject.price_min = price * 100;
    // productObject.variants[0].price = price;
    // productObject.priceChangesBySaleTag = true;
    productObject.variants[0].price = price * 100;
    productObject.priceChangesBySaleTag = true;
  } else {
    let badSaleTags = [];
    const tagBadSalePrefix = "BAD:sleva-";
    productTags.find(tag => {
      if (tag.includes(tagBadSalePrefix)) {
        badSaleTags.push(
          parseInt(tag.replace(tagBadSalePrefix, "").replace(" ", ""))
        );
      }
    });
    if (badSaleTags.length) {
      let lastPercent = 100;
      for (let badSlevaPercent of badSaleTags) {
        if (badSlevaPercent < lastPercent) {
          lastPercent = badSlevaPercent;
          percent = badSlevaPercent;
        }
      }

      // pruh zlavy
      if (percent > 0 && percent < 51) {
        // vypocet ceny pred dph
        price = productObject.variants[0].price / 100;
        price = (price * (100 - percent)) / 100; //vypocet slevy

        price = Math.round(price * 100);
        if (productObject.compare_at_price_max == 0) {
          productObject.compare_at_price_max = productObject.price_max;
        }
        if (productObject.compare_at_price_min == 0) {
          productObject.compare_at_price_min = productObject.price_min;
        }
        if (productObject.price_min > price / 100) {
          productObject.price_max = price / 100;
        }
        productObject.price_min = price / 100;
        productObject.variants[0].price = price;
        productObject.priceChangesBySaleTag = true;

        Object.assign(productObject, {
          price_min: Math.ceil(productObject.price_min * 100)
        });
      }
    }
  }

  return productObject;
}
