/**
 * @typedef { import("./types").ItemDetails } ItemDetails
 * @typedef { import("./types").ShopDefinition } ShopDefinition
 * @typedef { import("./types").ShopParams } ShopParams
 */

/**
 * Lookup of supported Shops
 *
 * If there is no logo yet, set the `viewBox` to `null`.
 * Any other property will render empty space on page.
 *
 * @type {Map<string, ShopDefinition>}
 */
export const shops = new Map([
  [
    "aaaauto",
    {
      name: "AAAAuto.cz",
      currency: "CZK",
      logo: "aaaauto_logo",
      url: "https://www.aaaauto.cz/",
      viewBox: "0 0 99 20",
      parse(url) {
        return {
          itemId: url.searchParams.get("id"),
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "aaaauto_sk",
    {
      name: "AAAAuto.sk",
      currency: "EUR",
      logo: "aaaauto_sk_logo",
      url: "https://www.aaaauto.sk/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.searchParams.get("id"),
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "alza",
    {
      name: "Alza.cz",
      currency: "CZK",
      logo: "alza_logo",
      url: "https://www.alza.cz/",
      viewBox: "0 0 60 19",
      parse(url) {
        return {
          itemId:
            url.pathname.match(/d(\d+)\./)?.[1] ?? url.searchParams?.get("dq"),
          itemUrl:
            url.pathname
              .substr(1)
              .match(/[^/]+$/)?.[0]
              .replace(".htm", "") ?? url.pathname.substr(1)
        };
      }
    }
  ],
  [
    "alza_sk",
    {
      name: "Alza.sk",
      currency: "EUR",
      logo: "alza_sk_logo",
      url: "https://www.alza.sk/",
      viewBox: null,
      parse(url) {
        return {
          itemId:
            url.pathname.match(/d(\d+)\./)?.[1] ?? url.searchParams?.get("dq"),
          itemUrl:
            url.pathname
              .substr(1)
              .match(/[^/]+$/)?.[0]
              .replace(".htm", "") ?? url.pathname.substr(1)
        };
      }
    }
  ],
  [
    "alza_uk",
    {
      name: "Alza.uk",
      currency: "GBP",
      logo: "alza_uk_logo",
      url: "https://www.alza.co.uk/",
      viewBox: null,
      parse(url) {
        return {
          itemId:
            url.pathname.match(/d(\d+)\./)?.[1] ?? url.searchParams?.get("dq"),
          itemUrl:
            url.pathname
              .substr(1)
              .match(/[^/]+$/)?.[0]
              .replace(".htm", "") ?? url.pathname.substr(1)
        };
      }
    }
  ],
  [
    "alza_at",
    {
      name: "Alza.at",
      currency: "EUR",
      logo: "alza_at_logo",
      url: "https://www.alza.at/",
      viewBox: null,
      parse(url) {
        return {
          itemId:
            url.pathname.match(/d(\d+)\./)?.[1] ?? url.searchParams?.get("dq"),
          itemUrl:
            url.pathname
              .substr(1)
              .match(/[^/]+$/)?.[0]
              .replace(".htm", "") ?? url.pathname.substr(1)
        };
      }
    }
  ],
  [
    "alza_hu",
    {
      name: "Alza.hu",
      currency: "HUF",
      logo: "alza_hu_logo",
      url: "https://www.alza.hu/",
      viewBox: null,
      parse(url) {
        return {
          itemId:
            url.pathname.match(/d(\d+)\./)?.[1] ?? url.searchParams?.get("dq"),
          itemUrl:
            url.pathname
              .substr(1)
              .match(/[^/]+$/)?.[0]
              .replace(".htm", "") ?? url.pathname.substr(1)
        };
      }
    }
  ],
  [
    "alza_de",
    {
      name: "Alza.de",
      currency: "EUR",
      logo: "alza_de_logo",
      url: "https://www.alza.de/",
      viewBox: null,
      parse(url) {
        return {
          itemId:
            url.pathname.match(/d(\d+)\./)?.[1] ?? url.searchParams?.get("dq"),
          itemUrl:
            url.pathname
              .substr(1)
              .match(/[^/]+$/)?.[0]
              .replace(".htm", "") ?? url.pathname.substr(1)
        };
      }
    }
  ],
  [
    "benu",
    {
      name: "Benu.cz",
      currency: "CZK",
      logo: "benu_logo",
      url: "https://www.benu.cz/",
      viewBox: "0 0 67 18",
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.match(/\/([^/]+)/)?.[1]
        };
      }
    }
  ],
  [
    "czc",
    {
      name: "CZC.cz",
      currency: "CZK",
      logo: "czc_logo",
      url: "https://www.czc.cz/",
      viewBox: "0 0 55 13",
      parse(url) {
        return {
          itemId: url.pathname.match(/\/(\d+.*)\//)?.[1].replace("a", ""),
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "datart",
    {
      name: "Datart.cz",
      currency: "CZK",
      logo: "datart_logo",
      url: "https://www.datart.cz/",
      viewBox: "0 0 98 13",
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.substr(1).match(/([^/]+)\.html$/)?.[1]
        };
      }
    }
  ],
  [
    "datart_sk",
    {
      name: "Datart.sk",
      currency: "EUR",
      logo: "datart_sk_logo",
      url: "https://www.datart.sk/",
      viewBox: null,
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.substr(1).match(/([^/]+)\.html$/)?.[1]
        };
      }
    }
  ],
  [
    "dm",
    {
      key: "dm_cz",
      name: "DM.cz",
      currency: "CZK",
      logo: "dm_logo",
      url: "https://www.dm.cz/",
      viewBox: "0 0 400 264.84375",
      parse(url) {
        return {
          itemId: url.pathname.match(/-p(\d+)\.html$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "mojadm_sk",
    {
      key: "dm_sk",
      name: "mojadm.sk",
      currency: "EUR",
      logo: "dm_logo",
      url: "https://www.mojadm.sk/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/-p(\d+)\.html$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "dm_de",
    {
      name: "DM.de",
      currency: "EUR",
      logo: "dm_logo",
      url: "https://www.dm.de/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/-p(\d+)\.html$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "dm_at",
    {
      name: "DM.at",
      currency: "EUR",
      logo: "dm_logo",
      url: "https://www.dm.at/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/-p(\d+)\.html$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "dm_pl",
    {
      name: "DM.pl",
      currency: "PLN",
      logo: "dm_logo",
      url: "https://www.dm.pl/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/-p(\d+)\.html$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "dm_hu",
    {
      name: "DM.hu",
      currency: "HUF",
      logo: "dm_logo",
      url: "https://www.dm.hu/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/-p(\d+)\.html$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "e-coop",
    {
      key: "e-coop_cz",
      name: "e-coop.cz",
      currency: "CZK",
      logo: "e-coop_logo",
      url: "https://www.e-coop.cz/",
      viewBox: null,
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.match(/([^/]+)\.html$/)?.[1]
            ? url.pathname.match(/([^/]+)\.html$/)?.[1]
            : url.pathname.match(/s\/(.*)\/c/s)?.[1]
        };
      }
    }
  ],
  [
    "electroworld",
    {
      name: "electroworld.cz",
      currency: "CZK",
      logo: "electroworld_logo",
      url: "https://www.electroworld.cz/",
      viewBox: "0 0 400 210",
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.match(/\/([^\/]+)/)?.[1]
        };
      }
    }
  ],
  [
    "eva_cz",
    {
      name: "eva.cz",
      currency: "CZK",
      logo: "eva_logo",
      url: "https://www.eva.cz/",
      viewBox: "0 0 400 154.4",
      parse(url) {
        return {
          itemId: url.pathname.match(/\/([^zbozi\/]+)\//)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "iglobus",
    {
      key: "globus_cz",
      name: "iGlobus.cz",
      currency: "CZK",
      logo: "iglobus_logo",
      url: "https://www.iglobus.cz/",
      viewBox: null,
      parse(url) {
        return {
          itemId: null,
          itemUrl:
            url.hash.match(/#(.+)/)?.[1] ??
            url.pathname.match(/\/[^/]+\/([^/]+)$/)?.[1]
        };
      }
    }
  ],
  [
    "ikea_cz",
    {
      name: "ikea.cz",
      currency: "CZK",
      logo: "ikea_logo",
      url: "https://www.ikea.com/cz/cs/",
      viewBox: "0 0 400 160.15625",
      parse(url) {
        return {
          itemId: url.pathname.match(/(\d+)\//)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "ikea_sk",
    {
      name: "ikea.sk",
      currency: "EUR",
      logo: "ikea_logo",
      url: "https://www.ikea.com/sk/sk/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/(\d+)\//)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "ikea_pl",
    {
      name: "ikea.pl",
      currency: "PLN",
      logo: "ikea_logo",
      url: "https://www.ikea.com/pl/pl/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/(\d+)\//)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "ikea_at",
    {
      name: "ikea.at",
      currency: "EUR",
      logo: "ikea_logo",
      url: "https://www.ikea.com/at/de/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/(\d+)\//)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "ikea_de",
    {
      name: "ikea.de",
      currency: "EUR",
      logo: "ikea_logo",
      url: "https://www.ikea.com/de/de/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/(\d+)\//)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "ikea_hu",
    {
      name: "ikea.hu",
      currency: "HUF",
      logo: "ikea_logo",
      url: "https://www.ikea.com/hu/hu/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/(\d+)\//)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "itesco",
    {
      name: "iTesco.cz",
      currency: "CZK",
      logo: "itesco_logo",
      url: "https://www.itesco.cz/",
      viewBox: "0 0 55 18",
      parse(url) {
        return {
          itemId: url.pathname.match(/(\d+)$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "itesco_sk",
    {
      name: "iTesco.sk",
      currency: "EUR",
      logo: "itesco_sk_logo",
      url: "https://www.itesco.sk/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/(\d+)$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "kasa",
    {
      name: "Kasa.cz",
      currency: "CZK",
      logo: "kasa_logo",
      url: "https://www.kasa.cz/",
      viewBox: "0 0 70 18",
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.match(/\/([^/]+)/)?.[1]
        };
      }
    }
  ],
  [
    "knihydobrovsky",
    {
      name: "knihydobrovsky.cz",
      currency: "CZK",
      logo: "knihydobrovsky_logo",
      url: "https://www.knihydobrovsky.cz/",
      viewBox: "0 0 220 54",
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.match(/-(\d+)$/g)?.[0].substr(1)
        };
      }
    }
  ],
  [
    "kosik",
    {
      name: "Košík.cz",
      currency: "CZK",
      logo: "kosik_logo",
      url: "https://www.kosik.cz/",
      viewBox: "0 0 71 22",
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.match(/[^/]+$/)?.[0]
        };
      }
    }
  ],
  [
    "lekarna",
    {
      name: "Lékárna.cz",
      currency: "CZK",
      logo: "lekarna_logo",
      url: "https://www.lekarna.cz/",
      viewBox: "0 0 79 20",
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.substr(1).match(/(?:[^/]+\/)?([^/]+)/)?.[1]
        };
      }
    }
  ],
  [
    "lidl_cz",
    {
      name: "lidl.cz",
      currency: "CZK",
      logo: "lidl_logo",
      url: "https://www.lidl.cz/",
      viewBox: "0 0 400 400",
      parse(url) {
        return {
          itemId: url.pathname.match(/\/p(\d+)/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "mall",
    {
      name: "Mall.cz",
      currency: "CZK",
      logo: "mall_logo",
      url: "https://www.mall.cz/",
      viewBox: "0 0 68 19",
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.substr(1).match(/[^/]+$/)?.[0]
        };
      }
    }
  ],
  [
    "mall_sk",
    {
      name: "Mall.sk",
      currency: "EUR",
      logo: "mall_sk_logo",
      url: "https://www.mall.sk/",
      viewBox: null,
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.substr(1).match(/[^/]+$/)?.[0]
        };
      }
    }
  ],
  [
    "mironet",
    {
      name: "Mironet.cz",
      currency: "CZK",
      logo: "mironet_logo",
      url: "https://www.mironet.cz/",
      viewBox: "0 0 59 20",
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.replace(/\//g, "")
        };
      }
    }
  ],
  [
    "mountfield",
    {
      name: "Mountfield.cz",
      currency: "CZK",
      logo: "mountfield_logo",
      url: "https://www.mountfield.cz/",
      viewBox: "0 0 64 11",
      parse(url) {
        return {
          itemId: url.pathname.match(/-([^-]+)$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "mountfield_sk",
    {
      name: "Mountfield.sk",
      currency: "EUR",
      logo: "mountfield_sk_logo",
      url: "https://www.mountfield.sk/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/-([^-]+)$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "hornbach",
    {
      name: "hornbach.cz",
      currency: "CZK",
      logo: "hornbach_logo",
      url: "https://www.hornbach.cz/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/(\d+)\/artikl.html/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "hornbach_sk",
    {
      name: "hornbach.sk",
      currency: "EUR",
      logo: "hornbach_logo",
      url: "https://www.hornbach.sk/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/(\d+)\/artikel.html/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "notino",
    {
      name: "Notino.cz",
      currency: "CZK",
      logo: "notino_logo",
      url: "https://www.notino.cz/",
      viewBox: "0 0 68 13",
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.substr(1).replace(/\//g, "")?.[1]
        };
      }
    }
  ],
  [
    "notino_sk",
    {
      name: "Notino.sk",
      currency: "EUR",
      logo: "notino_sk_logo",
      url: "https://www.notino.sk/",
      viewBox: null,
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.substr(1).replace(/\//g, "")?.[1]
        };
      }
    }
  ],
  [
    "obi_cz",
    {
      name: "obi.cz",
      currency: "CZK",
      logo: "obi_logo",
      url: "https://www.obi.cz/",
      viewBox: "0 0 400 99.375",
      parse(url) {
        return {
          itemId: url.pathname.match(/p\/(\d+)(#\/)?$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "obi_sk",
    {
      name: "obi.sk",
      currency: "EUR",
      logo: "obi_logo",
      url: "https://www.obi.sk/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/p\/(\d+)(#\/)?$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "obi_pl",
    {
      name: "obi.sk",
      currency: "PLN",
      logo: "obi_logo",
      url: "https://www.obi.pl/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/p\/(\d+)(#\/)?$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "obi_hu",
    {
      name: "obi.sk",
      currency: "HUF",
      logo: "obi_logo",
      url: "https://www.obi.hu/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/p\/(\d+)(#\/)?$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "obi-italia_it",
    {
      name: "obi-italia.it",
      currency: "HUF",
      logo: "obi_logo",
      url: "https://www.obi-italia.it/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/p\/(\d+)(#\/)?$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "obi_de",
    {
      name: "obi.de",
      currency: "EUR",
      logo: "obi_logo",
      url: "https://www.obi.de/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/p\/(\d+)(#\/)?$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "obi_at",
    {
      name: "obi.at",
      currency: "EUR",
      logo: "obi_logo",
      url: "https://www.obi.at/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/p\/(\d+)(#\/)?$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "obi_ru",
    {
      name: "obi.ru",
      currency: "EUR",
      logo: "obi_logo",
      url: "https://www.obi.ru/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/p\/(\d+)(#\/)?$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "obi_ch",
    {
      name: "obi.ch",
      currency: "EUR",
      logo: "obi_logo",
      url: "https://www.obi.ch/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/p\/(\d+)(#\/)?$/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "okay",
    {
      name: "Okay.cz",
      currency: "CZK",
      logo: "okay_logo",
      url: "https://www.okay.cz/",
      viewBox: "0 0 53 20",
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.match(/\/([^/]+)/)?.[1]
        };
      }
    }
  ],
  [
    "okay_sk",
    {
      name: "Okay.sk",
      currency: "EUR",
      logo: "okay_sk_logo",
      url: "https://www.okay.sk/",
      viewBox: null,
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.match(/\/([^/]+)/)?.[1]
        };
      }
    }
  ],
  [
    "pilulka",
    {
      name: "Pilulka.cz",
      currency: "CZK",
      logo: "pilulka_logo",
      url: "https://www.pilulka.cz/",
      viewBox: "0 0 86 20",
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.match(/\/([^/]+)/)?.[1]
        };
      }
    }
  ],
  [
    "pilulka_sk",
    {
      name: "Pilulka.sk",
      currency: "EUR",
      logo: "pilulka_sk_logo",
      url: "https://www.pilulka.sk/",
      viewBox: null,
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.match(/\/([^/]+)/)?.[1]
        };
      }
    }
  ],
  [
    "prozdravi",
    {
      name: "Prozdraví.cz",
      currency: "CZK",
      logo: "prozdravi_logo",
      url: "https://www.prozdravi.cz/",
      viewBox: "0 0 91 20",
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.match(/[^/]+$/)?.[0].replace(".html", "")
        };
      }
    }
  ],
  [
    "rohlik",
    {
      name: "Rohlík.cz",
      currency: "CZK",
      logo: "rohlik_logo",
      url: "https://www.rohlik.cz/",
      viewBox: "0 0 51 28",
      parse(url) {
        return {
          itemId:
            url.searchParams.get("productPopup")?.match(/^(\d+)/)?.[1] ??
            url.pathname.substr(1).match(/^(\d+)/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "rozetka_com_ua",
    {
      name: "Rozetka",
      currency: "UAH",
      logo: "rozetka_logo",
      url: "https://rozetka.com.ua/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.match(/p(\d+)/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "sleky",
    {
      name: "sLéky.cz",
      currency: "CZK",
      logo: "sleky_logo",
      url: "https://www.sleky.cz/",
      viewBox: null,
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.match(/\/([^/]+)/)?.[1]
        };
      }
    }
  ],
  [
    "tetadrogerie",
    {
      key: "teta_cz",
      name: "Teta Drogerie",
      currency: "CZK",
      logo: "teta_cz_logo",
      url: "https://www.tetadrogerie.cz/",
      viewBox: null,
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.replace("/eshop/katalog/", "")
        };
      }
    }
  ],
  [
    "tsbohemia",
    {
      name: "TSBohemia.cz",
      currency: "CZK",
      logo: "tsbohemia_logo",
      url: "https://www.tsbohemia.cz/",
      viewBox: "0 0 115 15",
      parse(url) {
        return {
          itemId: url.pathname.match(/d(\d+)\.html/)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "notino",
    {
      name: "notino.cz",
      currency: "CZK",
      logo: "notino_logo",
      url: "https://www.notino.cz/",
      viewBox: "0 0 98 13",
      parse(url) {
        return {
          itemId: url.pathname.substr(1).match(/p-(\d+)\//)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "notino_sk",
    {
      name: "notino.sk",
      currency: "EUR",
      logo: "notino_sk_logo",
      url: "https://www.notino.sk/",
      viewBox: null,
      parse(url) {
        return {
          itemId: url.pathname.substr(1).match(/p-(\d+)\//)?.[1],
          get itemUrl() {
            return this.itemId;
          }
        };
      }
    }
  ],
  [
    "makro",
    {
      name: "makro.cz",
      currency: "CZK",
      logo: "makro_logo",
      url: "https://www.makro.cz/",
      viewBox: null,
      parse(url) {
        return {
          itemId: null,
          itemUrl: url.pathname.substr(1).match(/(\d+)p\//)?.[1]
        };
      }
    }
  ]
]);

/**
 * Gets supported Shops as array of tuples of key and shop definition
 * @return {[string, ShopDefinition][]}
 */
export function shopsEntriesArray() {
  return Array.from(shops.entries());
}

export function shopsArray() {
  return Array.from(shops.values());
}

const twoLevelTlds = new Set(["uk", "ua"]);
const countryInUrl = new Set(["ikea"]);

/**
 * Creates internal name representation for lookups and DB key composition.
 * @param {string} s URL like string
 * @returns {string | null}
 */
export function shopName(s) {
  const url = new URL(s);
  const domainParts = url.host.split(".");
  let domain = domainParts.pop();
  let shopName = domainParts.pop();
  if (twoLevelTlds.has(domain)) {
    domain = `${shopName}_${domain}`;
    shopName = domainParts.pop();
  }
  if (countryInUrl.has(shopName)){
    domain = url.pathname.split("/")[1];
  }

  const fullKey = `${shopName}_${domain}`;
  if (shops.get(fullKey)) return fullKey;
  if (shops.get(shopName)) return shopName;
  return null;
}

/**
 * @param {string} detailUrl
 * @returns {ItemDetails | null}
 */
export function parseItemDetails(detailUrl) {
  const name = shopName(detailUrl);
  let shop = shops.get(name);
  if (!shop) return null;
  const { key, currency, name: title, parse } = shop;
  return { key: key ?? name, title, currency, ...parse(new URL(detailUrl)) };
}

/**
 * @param {ShopParams} params
 * @returns {string}
 */
export function shopHost(params) {
  const url = new URL(decodeURIComponent(params?.url));
  return url.hostname;
}
