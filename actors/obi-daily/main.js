// const SITEMAP_URL = "https://www.tsbohemia.cz/sitemap_index.xml";
// const COUNTRY = {
//   CZ: "CZ",
//   SK: "SK",
//   PL: "PL",
//   HU: "HU",
//   IT: "IT", // obi-italia.it
//   DE: "DE",
//   AT: "AT",
//   RU: "RU",
//   CH: "CH"
// };

//https://www.obi.cz/sitemap_index.xml -> https://www.obi.cz/sitemaps/obi_cs_cz/sitemap_obi-category.xml

// label default empty (https://www.obi.country || obi-italia.it)
// categorie  = div.headr__nav-cat-col-inner > div.headr__nav-cat-row > a.headr__nav-cat-link
// categorie (url: https://www.obi.cz/bydleni/c/874, label: CAT) -> url

// label: CAT (https://www.obi.cz/bydleni/c/874)
// subcategorie = ul.first-level > li > a
// subcategorie (url: https://www.obi.cz/bydleni/nabytek/c/2226, label: SUBCAT) > url

// label: SUBCAT ( https://www.obi.cz/bydleni/nabytek/c/2226)
// get productCount: div.variants --> data-productcount (312 products)
// get productPerPageCount per page: li.product (72 products per page)
// pagination: Math.ceil(productCount / productPerPageCount)  (5 pages)
// add pagination for i=2..5 (url: https://www.obi.cz/bydleni/nabytek/c/2226?page=i, label: LIST ) -> url

// label: LIST (https://www.obi.cz/bydleni/nabytek/c/2226)
// product li.product > a , get href
// detail (url: https://www.obi.cz/zavesne-kreslo-a-vznasejici-se-kreslo/zavesne-kreslo-lytton-z-polycottonu-bila/p/5793559,
// label: DETAIL) -> url

// label: DETAIL (https://www.obi.cz/zavesne-kreslo-a-vznasejici-se-kreslo/zavesne-kreslo-lytton-z-polycottonu-bila/p/5793559)
// goal: productAttributes = {
//           itemId: p.gtin,
//           itemName: `${p.brandName} ${p.name}`,
//           itemUrl: createProductUrl(
//             country,
//             p.links
//               .filter(x => x.rel === "self")
//               .map(x => x.href)
//               .pop()
//           ),
//           img: p.links
//             .filter(x => x.rel.startsWith("productimage"))
//             .map(x => x.href)
//             .pop(),
//           inStock: !p.notAvailable,
//           currentPrice: parseFloat(p.price),
//           originalPrice: p.isSellout ? parseFloat(p.selloutPrice) : null,
//           currency: p.priceCurrencyIso,
//           category,
//           discounted: p.isSellout
//         };
// have: dataLayer = [
//   {
// 	"page": "cz.assortment.bydlení.nábytek.křesla.závěsné_křeslo_a_vznášející_se_kreslo.závěsné_křeslo_lytton_z_polycottonu_bílá.ads",
// 	"contentGroup1": "assortment",
// 	"contentGroup2": "Bydlení",
// 	"contentGroup3": "Nábytek",
// 	"contentGroup4": "Křesla",
// 	"contentGroup5": "Závěsné křeslo a vznášející se kreslo",
// 	"language": "cz",
// 	"pagetype": "ads",
// 	"store": "014 - Praha - Štěrboholy",
// 	"displayType": "d",
// 	"userStatus": 0,
// 	"channel": "mix",
// 	"ecommerce": {
// 		"currencyCode": "CZK",
// 		"detail": {
// 			"products": [
// 				{
// 					"name": "Závěsné křeslo Lytton z polycottonu bílá",
// 					"id": "5793559",
// 					"price": "825.62",
// 					"brand": "",
// 					"category": "Bydlení/Nábytek/Křesla/Závěsné křeslo a vznášející se kreslo",
// 					"categoryId": "2368"
// 				}
// 			]
// 		}
// 	}
// }
// ]
// ?? const dataLayer = await page.evaluate((varname) => window[varname], 'dataLayer');
// price span.overview__price
// img img.ads-slider__image [0]
// inStock: !!dataLayer.store
