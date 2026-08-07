# Extension

## 2.4.10
* Fixed Mountfield.cz crash when the price meta tag is missing; scraper falls back to the product JSON-LD (#3581)
* Hardened the shared price parser against missing input, protecting all shop modules from the same crash class
* Fixed Datart.cz originalPrice after the Omnibus reference-price class rename, restoring coupon-discount detection (#2882)
* Fixed Globus widget anchor after the detail price moved out of the ProductDetailInfo component (#3546)
* Fixed DM.cz and mojadm.sk price lookup for the new `/p/d/<id>/<slug>` URL format — the API now resolves DM's internal id to the GTIN the data is keyed by (#3552)
* Removed Datart.sk (now nay.sk) from the supported-shops listings (#3341)
* Fixed Chrome Web Store publishing, stuck since 2.4.9 (Chrome users were still on 2.4.8)

## 2.4.9
* Scraped prices are applied locally to the chart and discount computation instead of being submitted to the API, so personalized (member/club) discounts stay visible to the user without entering the public dataset (#3551)
* Fixed Rohlik.cz product detail scraping after markup changes, including a 100× price bug when the cents superscript was present but the crowns part was unparseable
* Fixed 4camping.cz products without variants and moved the widget to the top layer
* Stabilized Pilulka.cz product rendering
* Fixed stale chart reference kept after widget cleanup on SPA navigation
* Removed no-longer-monitored shops (TS Bohemia, Smarty and other deprecated shops) from the supported-shops listings in the extension about page and on the web (#3341, #3550)

## 2.4.8
* Disabled extension-side price ingestion as a hot fix for logged-in user prices (member/club discounts) being saved as the product's public day price (#3551)
* Fixed Notino "blinks and hides" on canonical (no `/p-<id>/`) product URLs by re-rendering from cached data when Vue/Nuxt wholesale-replaces the chart's parent subtree
* Fixed Teta drogerie blink on product URLs with special characters
* Fixed Datart.cz originalPrice on standard-discount products after EU-Omnibus refPrice layout change
* Fixed Eva.cz rendering after `.zpanel-price` inner wrapper class rename
* Fixed Lekarna.cz originalPrice missing on standard-discount products
* Fixed DM.cz "Missing slug" error after the new `/p/d/<id>/<slug>` URL format rollout
* Fixed Knihydobrovsky.cz e-book pages where the chart anchor was missing
* Fixed Globus.cz after the move to globusonline.cz and the Next.js rewrite

## 2.4.7
* Fixed Kosik.cz rendering when navigating between products in the popup product detail
* Fixed AsyncShop leaving the loading lock acquired on early-return paths, which permanently blocked subsequent renders for any shop where the API returned no data once
* Removed noisy "Data not found" console errors emitted during SPA route transitions on Kosik and TS Bohemia
* Fixed Mountfield ignoring club/loyalty price and using recommended retail price as originalPrice fallback
* Fixed Notino.cz respecting voucher/coupon prices
* Fixed Teta drogerie returning null prices for non-discounted products
* Fixed Alza.cz price selectors for new markup and coupon originalPrice
* Fixed Datart.cz coupon price handling

## 2.4.6
* Fixed Lidl.cz rendering and Vue/Nuxt hydration race
* Fixed Eva.cz rendering after meta tag removal
* Fixed DM.cz rendering and SPA navigation between products
* Fixed Benu.cz rendering after Vite app rewrite
* Fixed Kosik.cz rendering after data-tid migration and split-span price parsing
* Fixed Teta drogerie rendering after full site redesign
* Fixed TS Bohemia rendering after Next.js redesign (incl. disabled / out-of-stock products)
* Fixed Ikea rendering after structured-data selector removal
* Fixed Lekarna rendering after structured-data snippet removal
* Fixed chart not re-injecting on SPA client-side navigation when the framework removes the parent subtree

## 2.4.5 
* Fixed Datart slug extraction
* Fixed Grizly rendering

## 2.4.4
* Fixed Pilulka current price extraction
* Fixed Tchibo.cz rendering

## 2.4.3
* Fixed Pilulka rendering
* Fixed Notino original price extraction

## 2.4.2
* Fixed Grizly original price extraction
* Fixed Globus current price extraction
* Fixed Hornbach current price extraction
* Fixed Pilulka original price extraction

## 2.4.1
* Fixed Lidl.cz rendering
* Fixed 4camping data fetching

## 2.4.0
* Added new shops grizly.cz and grizly.sk
* Fixed Megapixel.cz rendering
* Fixed Lekarna.cz rendering
* Fixed Alza.cz extraction of coupon price 
* Fixed Tchibo.cz prices extraction
* Fixed 4camping new design injection point

## 2.3.0
* Added new shops 4camping.cz and 4camping.sk
* Removed PennyDomu.cz as it's no longer operational
* Removed definitions of non-CZ and SK shop variants as we don't provide data for them in our API
* Fixed m.alza.cz current price extraction
* Fixed Albert.cz rendering
* Fixed Lidl.cz rendering
* Fixed DM.cz rendering
* Enabled Firefox Android support - experimental, not tested on all shops

## 2.2.0
* The detail API call moved from content script to service worker
* Removed custom CSP

## 2.1.13
* Fix Alza voucher price parsing
* Fix Tetadrogerie price parsing for multiple pieces
* Fix Okay.cz curent price parsing
* Fix Knihy Dobrovsky extension rendering

## 2.1.12
* Removed unsupported e-shops

## 2.1.11
* Fix Notino voucher price parsing
* Fix Pilulka prices parsing

## 2.1.10
* Fix Alza detail title scrape

## 2.1.9
* Fix extension rendering on Pilulka

## 2.1.8
* Added shop.billa.cz
* Added albert.cz
* Added pennydomu.cz
* Removed kasa.cz

## 2.1.7
* Fix Teta original price parsing
* Fix Knihy Dobrovsky original price parsing

## 2.1.6
* Fix teta drogerie original price parsing
* Fix Knihy Dobrovsky original price parsing

## 2.1.5
* Fix Extension on Mironet - changed CSS classes

## 2.1.4
* Disabled Allegro extension

## 2.1.3
* Removed unnecessary permissions from manifest
* `system-ui` fallback font
* Minor styling of Okay widget

## 2.1.2
* Fixed scrape of VAT price on Mironet.cz
* Changed Chart.js usage tyo be able to publish Firefox extension with Manifest v3
* Added permissions to manifest

## 2.1.1
* Fixed Okay.cz hiding our widget

## 2.1.0
* Added Allegro.cz
* Added Kaufland.cz
* Fixed DM.cz and MojaDM.sk
* Fixed TetaDrogerie.cz and sk
* Fixed Mironet.cz and sk
* Fixed Okay.cz and sk
* Fixed ProZdraví.cz
* Fixed Notino.cz and sk
