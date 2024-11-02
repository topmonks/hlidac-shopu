// This is copy of https://www.okay.cz/cdn/shop/t/366/assets/product-price-by-tags.js?v=18180124900739432381729674289
/* global $, Shopify, Currency, storage, ProductCard */
/* exported ProductPriceByTags, calculateTagSalePrice, getPriceWithDiscount */


const ProductPriceByTags = (() => {
    const COMPARE_PRICES_ROUNDED = Shopify.locale.startsWith('cs');

    const calculateTagSalePrice = (productObject) => {
        const productFormElement = $('.product_form');
        let productDetail = false;

        if (typeof productObject == 'undefined' && productFormElement.length) {
            productObject = productFormElement.data('product');
            productDetail = true;
        }

        if (typeof productObject == 'undefined' || typeof productObject.tags == 'undefined') {
            console.warn('something is wrong - cannot load product data');
            return;
        }

        const isProductSoldOut =
            (typeof productObject.available !== 'undefined' && !productObject.available) ||
            (productObject.variants.length > 0 && !productObject.variants[0].available);

        if (
            productObject.tags.includes(Shopify.theme_settings.tag_store_price) ||
            (isProductSoldOut && !Shopify.theme_settings.enable_discounts_for_sold_out)
        ) {
            return productObject;
        }

        const isSellerLoggedIn = typeof localStorage.sellerId !== 'undefined';
        const isStoreFilterOn = storage.filterProductsOnBranch;

        if (isSellerLoggedIn && isStoreFilterOn) {
            const isStorePriceDefined = checkStorePriceDefined(productObject, productDetail);
            if (isStorePriceDefined) {
                return productObject;
            }
        }

        const setProductObjectPrices = (price) => {
            if (productObject.compare_at_price_max === 0) {
                productObject.compare_at_price_max = productObject.price_max;
            }
            if (productObject.compare_at_price_min === 0) {
                productObject.compare_at_price_min = productObject.price_min;
            }
            if (productObject.price_min > price) {
                productObject.price_max = price;
            }

            productObject.price_min = price;
            productObject.variants[0].price = price * 100;
            productObject.priceChangesBySaleTag = true;
        };

        const mktTagsSrdce = productObject.tags
            .filter((tag) => {
                const isDisabledTagAction = ProductCard.isDisabledTagAction(tag, productObject.variants[0].available);

                return tag.includes('MKT:') && tag.includes('❤') && !isDisabledTagAction;
            })
            .map((tag) => tag.substring(tag.indexOf('MKT:') + 4, tag.lastIndexOf('❤')));

        const mktTagsHvezda = productObject.tags.filter((tag) => {
            return tag.includes('★') && (
                tag.includes(Shopify.theme_settings.tag_bad_percent_prefix) ||
                tag.includes(Shopify.theme_settings.tag_bad_fixed_prefix) ||
                tag.includes(Shopify.theme_settings.tag_bad_without_vat)
            );
        });

        let price;
        let cashbackDiscount = 0;
        let cashbackPriceText = '';

        if (productDetail) {
            for (const tagContent of mktTagsSrdce) {
                generateMktInfobox(tagContent);

                if (tagContent.includes(Shopify.theme_settings.cashback_discount_string)) {
                    cashbackDiscount = parseInt(tagContent, 10);
                    cashbackPriceText = Shopify.translation.discount_with_cashback_info_text;
                }
            }

            // calculate price with discount code if there is no additional discount
            if (mktTagsHvezda.length === 0) {
                let discountPriceText = '';
                let fixedDiscount = 0;
                let percentDiscount = 0;

                for (const tagContent of mktTagsSrdce) {
                    if (tagContent.includes(Shopify.theme_settings.amount_discount_string)) {
                        discountPriceText = Shopify.translation.discount_with_code_info_text;
                        fixedDiscount = parseInt(tagContent, 10);
                        break;
                    } else if (tagContent.includes(Shopify.theme_settings.percent_discount_string)) {
                        discountPriceText = Shopify.translation.discount_with_code_info_text;
                        percentDiscount = parseInt(tagContent, 10);
                        break;
                    }
                }

                if (discountPriceText !== '') {
                    price = productObject.variants[0].price / 100;
                    price = price * (100 - percentDiscount) / 100;
                    price = (price - fixedDiscount);
                    price = rounded(price);

                    productObject.variants[0].price = price * 100;
                    productObject.priceChangesBySaleTag = true;

                    if (productDetail) {
                        updateProductPriceElement(price * 100, discountPriceText, productObject);
                    }
                }
            }
        }

        const hasBadWithoutVat = mktTagsHvezda.find((tag) => tag.includes(Shopify.theme_settings.tag_bad_without_vat));

        // "Bez dph" discount has the highest priority - that might change in the future
        if (hasBadWithoutVat) {
            const vatCoefficient = Shopify.theme_settings.shop_vat + 1;
            price = productObject.variants[0].price / 100;
            price = price / vatCoefficient;
            price = rounded(price);

            setProductObjectPrices(price);

            if (productDetail) {
                generateMktInfobox(Shopify.translation.without_vat_price_discount);
                updateProductPriceElement(price * 100, Shopify.translation.price_after_discount_apply, productObject);
                updateProductSavingBadge(productObject.price_min, productObject.compare_at_price_min);
            }
        } else {
            const badPercentTags = [];
            const badFixedTags = [];
            const tagBadPercentPrefix = Shopify.theme_settings.tag_bad_percent_prefix;
            const tagBadFixedPrefix = Shopify.theme_settings.tag_bad_fixed_prefix;

            // Happy Day - Manual Discounts (lower priority) - see issue #2197
            if (mktTagsHvezda.length === 0) {
                for (const discount of Shopify.theme_settings.hd_manual_discounts) {
                    if (productObject.tags.includes(discount.tag)) {
                        const prefix = discount.type === 'percentual' ? tagBadPercentPrefix : tagBadFixedPrefix;
                        mktTagsHvezda.push(`${prefix}${discount.amount}★`);
                    }
                }
            }

            for (const tag of mktTagsHvezda) {
                if (tag.includes(tagBadPercentPrefix)) {
                    badPercentTags.push(
                        parseInt(tag.replace(tagBadPercentPrefix, '').replace(/\s/g, '')),
                    );
                } else if (tag.includes(tagBadFixedPrefix)) {
                    badFixedTags.push(
                        parseInt(tag.replace(tagBadFixedPrefix, '').replace(/\s/g, '')),
                    );
                }
            }

            let discountBarContent = '';
            let isDiscountApplied = false;
            let priceAfterDiscountApply = Shopify.translation.price_after_discount_apply;

            // percentual discount is second in the hierarchy
            if (badPercentTags.length) {
                const percentAmount = Math.min(...badPercentTags);

                if (percentAmount > 0 && percentAmount < 51) {
                    isDiscountApplied = true;
                    price = productObject.variants[0].price / 100;
                    price = price * (100 - percentAmount) / 100;
                    price = rounded(price);

                    setProductObjectPrices(price);

                    if (productDetail) {
                        discountBarContent = Shopify.translation.additional_price_discount;
                        if (Shopify.theme_settings.show_discounts_by_price_history) {
                            discountBarContent = discountBarContent.split('{percent}')[0];
                        } else {
                            discountBarContent = discountBarContent.replace('{percent}', percentAmount);
                        }
                    }
                }

            // fixed amount discount is the last one in the hierarchy
            } else if (badFixedTags.length) {
                const fixedAmount = Math.min(...badFixedTags);

                // ensure that the cost of the product is at least 1
                if (fixedAmount < productObject.variants[0].price / 100) {
                    isDiscountApplied = true;
                    price = productObject.variants[0].price / 100;
                    price -= fixedAmount;

                    setProductObjectPrices(price);

                    if (productDetail) {
                        discountBarContent = Shopify.translation.fixed_price_discount;
                        if (Shopify.theme_settings.show_discounts_by_price_history) {
                            discountBarContent = discountBarContent.split('{amount}')[0];
                        } else {
                            discountBarContent = discountBarContent.replace('{amount}', fixedAmount);
                        }
                    }
                }
            }

            if (productDetail && isDiscountApplied) {
                let noteSuffix = '';
                if (!isPriceAtLowest(price * 100)) {
                    discountBarContent = Shopify.translation.enhanced_price.replace(/<sup>.+<\/sup>/ig, '');
                    priceAfterDiscountApply = Shopify.translation.enhanced_price;
                    noteSuffix = '*4';
                }

                generateMktInfobox(discountBarContent);
                updateProductPriceElement(price * 100, priceAfterDiscountApply, productObject, false, noteSuffix);
                updateProductSavingBadge(productObject.price_min, productObject.compare_at_price_min);
            }
        }

        if (productDetail && cashbackDiscount > 0) {
            if (!price) {
                price = productObject.variants[0].price;
            }
            updateProductPriceElement(price - cashbackDiscount * 100, cashbackPriceText, productObject, true);
        }

        return productObject;
    };

    const convertSourceProductObject = (data) => {
        const object = JSON.parse(JSON.stringify(data));

        object.price = parseFloat(object.price) * 100;
        object.price_min = parseFloat(object.price_min) * 100;
        object.price_max = parseFloat(object.price_max) * 100;
        object.compare_at_price_min = parseFloat(object.compare_at_price_min) * 100;
        object.compare_at_price_max = parseFloat(object.compare_at_price_max) * 100;
        object.variants.forEach((variant) => {
            variant.price = parseFloat(variant.price) * 100;
        });

        return object;
    };

    const checkStorePriceDefined = (productObject, productDetail) => {
        let storeDispoComplete = productObject.mf_store_shop_dispo;
        if (productDetail && !storeDispoComplete) {
            storeDispoComplete = $('.product_form').data('store-dispo');
        }
        if (storeDispoComplete) {
            productObject.currentStorePrice = storeDispoComplete.PRICE * 100;

            return true;
        }

        return false;
    };

    const getInfoboxOverride = (message, infoboxType) => {
        const compareString = Shopify.theme_settings[infoboxType];
        const overrideString = Shopify.theme_settings[`${infoboxType}_override`];

        if (overrideString && compareString && message.includes(compareString)) {
            const discountCode = message.substring(message.lastIndexOf(' ') + 1).trim();
            const discountAmount = parseInt(message, 10);

            message = overrideString
                .replace(/\{\{\s?coupon\s?}}/g, discountCode)
                .replace(/\{\{\s?amount\s?}}/g, discountAmount);
        }

        return message;
    };

    const generateMktInfobox = (message) => {
        if (!message) return;

        message = getInfoboxOverride(message, 'amount_discount_string');
        message = getInfoboxOverride(message, 'percent_discount_string');

        $('body.product .product__information .is-gray-around:eq( 0 )')
            .before(`<div class="mkt-infobox">${message}</div>`);
    };

    /**
     * Returns the lowest price in price history by the set of rules - see issue #1140
     *
     * @param {number[]} prices
     * @param {number} todaysPrice
     * @return {number}
     */
    const getComparablePrice = (prices, todaysPrice) => {
        if (!prices) return todaysPrice;

        let comparablePrice = todaysPrice;
        while (prices.length > 0) {
            const currentPrice = prices.pop();
            if (currentPrice < comparablePrice) {
                prices.push(currentPrice);
                break;
            }
            comparablePrice = currentPrice;
        }
        if (prices.length > 0) {
            comparablePrice = Math.min(...prices);
        }

        return comparablePrice;
    };

    const getPriceTitleWithSuffix = (priceTitle, withVat, noteSuffix) => {
        let suffix = '';
        if (!Shopify.theme_settings.taxes_included) {
            suffix = withVat ? ` ${Shopify.translation.include_vat}` : ` ${Shopify.translation.without_vat}`;
        }

        if (noteSuffix) {
            suffix += ` <sup>${noteSuffix}</sup>`;
        }

        return priceTitle + suffix;
    };

    const getPriceWithDiscount = (object) => {
        const item = convertSourceProductObject(object);
        let itemPrice = item.price_min;
        let itemComparePrice = item.compare_at_price_max;

        const updatedItem = calculateTagSalePrice(item);
        itemPrice = Math.min(updatedItem.price_min, itemPrice / 100);
        itemComparePrice = Math.max(updatedItem.compare_at_price_max, itemComparePrice);

        const accessoryPrice = Shopify.formatMoney(itemPrice * 100, Currency.money_format);
        const accessoryPriceNumber = itemPrice;
        let accessoryComparePrice = 0;
        if (itemComparePrice > itemPrice * 100) {
            accessoryComparePrice = Shopify.formatMoney(itemComparePrice, Currency.money_format);
        }

        return [accessoryPrice, accessoryComparePrice, accessoryPriceNumber];
    };

    /**
     * Helper function to calculate price with VAT according to VAT amount product tag.
     *
     * @param   {number}    price
     * @param   {Object}    product
     * @param   {boolean}   [shouldBeRounded = false]
     * @return  {number}    priceWithVat
     */
    const getPriceWithVat = (price, product, shouldBeRounded = false) => {
        let taxAmount = Shopify.theme_settings.shop_vat;
        if (product) {
            const tagPrefix = Shopify.theme_settings.tag_vat_amount_prefix;
            for (const tag of product.tags) {
                if (tag.startsWith(tagPrefix)) {
                    taxAmount = Number(tag.replace(tagPrefix, '')) / 100;
                    break;
                }
            }
        }
        taxAmount++;

        let priceWithVat = price * taxAmount;
        if (shouldBeRounded) {
            priceWithVat = Math.round(priceWithVat / 100) * 100;
        }

        return priceWithVat;
    };

    const handleFrontendDiscountsDueToLaws = ({
        updatedProductData,
        minimalPercentageDiscount,
        pricesHistory,
        filterProductsByStore,
        lowestPriceIn30Text,
        percentageDiscountText,
    }) => {
        const priceChangedBySaleTag = updatedProductData.priceChangesBySaleTag || false;
        let productPriceWithDiscount = updatedProductData.price_min;
        let shouldHideOriginalPrice = priceChangedBySaleTag;
        if (priceChangedBySaleTag) {
            productPriceWithDiscount = productPriceWithDiscount * 100;
        }
        const comparablePrice = getComparablePrice(pricesHistory, productPriceWithDiscount);

        if (!filterProductsByStore && comparablePrice > productPriceWithDiscount) {
            const percentage = Math.floor((comparablePrice - productPriceWithDiscount) / comparablePrice * 100);
            const hasDphDiscountTag = updatedProductData.tags
                .some((tag) => tag.includes(Shopify.theme_settings.tag_bad_without_vat) && tag.includes('★'));
            if (percentage >= minimalPercentageDiscount) {
                shouldHideOriginalPrice = true;
                updateComparePrice(
                    comparablePrice,
                    percentage,
                    lowestPriceIn30Text,
                    percentageDiscountText,
                    hasDphDiscountTag,
                    updatedProductData,
                );
                const currentPriceElement = document.querySelector('.is-gray-around .current_price');
                if (currentPriceElement && priceChangedBySaleTag) {
                    currentPriceElement.style.display = 'none';
                }
            }
        }
        const wasPriceElement = document.querySelector('.is-gray-around .was-price.was-price--detail');
        if ( wasPriceElement && shouldHideOriginalPrice) {
            wasPriceElement.style.display = 'none';
        }
    };

    const isPriceAtLowest = (price) => {
        const priceHistoryElement = document.getElementById('price-history-chart');
        if (!priceHistoryElement) return false;

        const priceHistory = priceHistoryElement.dataset.values
            .split(',')
            .map((price) => parseInt(price));
        const comparablePrice = getComparablePrice(priceHistory, price);

        return price < comparablePrice;
    };

    const rounded = (price) => {
        if (Currency.money_format.includes('no_decimals')) {
            return Math.round(price);
        }

        return price;
    };

    const updateProductPriceElement = (price, priceTitle, productObject, isCashback = false, noteSuffix = '') => {
        const htmlData =
            `<p class="current_price_mz ${isCashback ? 'is-cashback' : ''}">` +
            `<span class="title">${getPriceTitleWithSuffix(priceTitle, false, noteSuffix)}</span>` +
            `<span class="money sale">${Shopify.formatMoney(price, Currency.money_format)}</span>` +
            '</p>';

        const currentPriceElement = $('body.product .product__information .current_price');
        currentPriceElement.after(htmlData);

        if (!isCashback) {
            currentPriceElement.addClass('tags-sale');
        }

        if (!Shopify.theme_settings.taxes_included) {
            const priceInclVat = getPriceWithVat(price, productObject);

            const priceInclVatElement = $('body.product .product__information .current-price-incl-vat');
            priceInclVatElement.html(`
                <span>${getPriceTitleWithSuffix(priceTitle, true, noteSuffix)}</span>
                <span class="money">${Shopify.formatMoney(priceInclVat, Currency.money_format)}</span>
            `);
        }

        if (!isPriceAtLowest(price)) {
            const regularPriceWithVat = getPriceWithVat(productObject.price, productObject, COMPARE_PRICES_ROUNDED);
            currentPriceElement.find('.money').html(Shopify.formatMoney(regularPriceWithVat, Currency.money_format));
            currentPriceElement.find('.title').html(Shopify.translation.regular_price);
        }

        if (!Shopify.theme_settings.show_discounts) {
            currentPriceElement.hide();
        }
    };

    const updateComparePrice = (
        comparePrice,
        percentage,
        lowestPriceIn30Text,
        percentageDiscountText,
        hasDphDiscountTag,
        productData,
    ) => {
        const comparePriceContainer = document.createElement('p');
        comparePriceContainer.classList.add('compare_price');
        let discountText = `${percentageDiscountText} ${percentage} %`;
        if (hasDphDiscountTag) {
            discountText = Shopify.translation.discount_price_label_without_vat;
        }
        const comparePriceWithVat = getPriceWithVat(comparePrice, productData, COMPARE_PRICES_ROUNDED);
        comparePriceContainer.innerHTML = `<span class="title">${lowestPriceIn30Text} <sup>*2</sup></span>` +
            '<span class="money sale">' +
                Shopify.formatMoney(comparePriceWithVat, Currency.money_format_currency) +
            '</span>' +
            '<span></span>' +
            '<span class="compare_price--percentage">' +
                `${discountText}` +
            '</span>';
        const parentContainer = document.querySelector('.product__information .is-gray-around');
        if (parentContainer) {
            parentContainer.insertBefore(comparePriceContainer, parentContainer.firstChild);
        }
    };

    const updateProductSavingBadge = (price, compareAtPrice) => {
        const percentSale = Math.floor((compareAtPrice - (price * 100)) * 100 / compareAtPrice);
        $('.product__images .product__saving-badge').html(`-${percentSale}&nbsp;%`);
    };

    // expose these methods to the global scope
    return {
        calculateTagSalePrice,
        getComparablePrice,
        getPriceWithDiscount,
        getPriceWithVat,
        handleFrontendDiscountsDueToLaws,
    };
})();

// TODO: This is here just to maintain compatibility with the rest of the code
const getPriceWithDiscount = ProductPriceByTags.getPriceWithDiscount;
const calculateTagSalePrice = ProductPriceByTags.calculateTagSalePrice;
