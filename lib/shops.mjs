/**
 * @typedef { import("./types").ItemDetails } ItemDetails
 * @typedef { import("./types").ShopDefinition } ShopDefinition
 * @typedef { import("./types").ShopParams } ShopParams
 */

const forCampingCz = {
  name: "4camping.cz",
  currency: "CZK",
  logo: "4camping_logo",
  url: "https://www.4camping.cz/",
  viewBox: "0 0 275 64",
  /** @param {URL} url */
  parse(url) {
    return {
      get itemId() {
        return this.itemUrl;
      },
      itemUrl: `${url.pathname.split("/").filter(Boolean).at(-1)}${url.hash ? url.hash.replace("#", "-") : ""}`
    };
  }
};

const forCampingSk = {
  name: "4camping.sk",
  currency: "EUR",
  logo: "4camping_logo",
  url: "https://www.4camping.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      get itemId() {
        return this.itemUrl;
      },
      // get product slug + possible variant
      itemUrl: `${url.pathname.split("/").filter(Boolean).at(-1)}${url.hash ? url.hash.replace("#", "-") : ""}`
    };
  }
};

const aaaautoCz = {
  name: "AAAAuto.cz",
  currency: "CZK",
  logo: "aaaauto_logo",
  url: "https://www.aaaauto.cz/",
  viewBox: "0 0 99 20",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.searchParams.get("id"),
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const aaaautoSk = {
  name: "AAAAuto.sk",
  currency: "EUR",
  logo: "aaaauto_sk_logo",
  url: "https://www.aaaauto.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.searchParams.get("id"),
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const albertCz = {
  name: "Albert.cz",
  currency: "CZK",
  logo: "albert_logo",
  url: "https://www.albert.cz/shop/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.split("/")?.at(-1),
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const allegroCz = {
  name: "Allegro.cz",
  currency: "CZK",
  logo: "allegro_logo",
  url: "https://www.allegro.cz/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.split("-")?.at(-1),
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const alzaCz = {
  name: "Alza.cz",
  currency: "CZK",
  logo: "alza_logo",
  url: "https://www.alza.cz/",
  viewBox: "0 0 60 19",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/d(\d+)\./)?.[1] ?? url.searchParams?.get("dq"),
      itemUrl:
        url.pathname
          .substring(1)
          .match(/[^/]+$/)?.[0]
          .replace(".htm", "") ?? url.pathname.substring(1)
    };
  }
};

const alzaSk = {
  name: "Alza.sk",
  currency: "EUR",
  logo: "alza_logo",
  url: "https://www.alza.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/d(\d+)\./)?.[1] ?? url.searchParams?.get("dq"),
      itemUrl:
        url.pathname
          .substring(1)
          .match(/[^/]+$/)?.[0]
          .replace(".htm", "") ?? url.pathname.substring(1)
    };
  }
};

const autoEsaCz = {
  name: "AutoESA.cz",
  currency: "CZK",
  logo: "autoesa_logo",
  url: "https://www.autoesa.cz/",
  viewBox: "0 0 190 27",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.split("/").at(-1),
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const benuCz = {
  name: "Benu.cz",
  currency: "CZK",
  logo: "benu_logo",
  url: "https://www.benu.cz/",
  viewBox: "0 0 67 18",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.match(/\/([^/]+)/)?.[1]
    };
  }
};

const billaCz = {
  name: "Billa.cz",
  currency: "CZK",
  logo: "billa_logo",
  url: "https://shop.billa.cz/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      get itemId() {
        const params = new URLSearchParams(url.search);
        if (params.has("slug")) {
          return params.get("slug").split("-").at(-1);
        }
        return url.pathname.split("-").at(-1);
      },
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const datartCz = {
  name: "Datart.cz",
  currency: "CZK",
  logo: "datart_logo",
  url: "https://www.datart.cz/",
  viewBox: "0 0 98 13",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/([^/]+?)(?:\.html)?$/)[1]
    };
  }
};

const datartSk = {
  name: "Datart.sk",
  currency: "EUR",
  logo: "datart_sk_logo",
  url: "https://www.datart.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/([^/]+?)(?:\.html)?$/)[1]
    };
  }
};

const dmCz = {
  name: "DM.cz",
  currency: "CZK",
  logo: "dm_logo",
  url: "https://www.dm.cz/",
  viewBox: "0 0 400 264.84375",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/-p(\d+)\.html$/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const drmaxCz = {
  name: "drmax_cz",
  currency: "CZK",
  logo: "drmax_logo",
  url: "https://www.drmax.cz/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname,
      itemUrl: url.pathname
    };
  }
};

const drmaxSk = {
  name: "drmax_sk",
  currency: "EUR",
  logo: "drmax_logo",
  url: "https://www.drmax.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname,
      itemUrl: url.pathname
    };
  }
};

const mojaDmSk = {
  key: "dm_sk",
  name: "mojaDM.sk",
  currency: "EUR",
  logo: "dm_logo",
  url: "https://www.mojadm.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/-p(\d+)\.html$/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const evaCz = {
  name: "EVA.cz",
  currency: "CZK",
  logo: "eva_logo",
  url: "https://www.eva.cz/",
  viewBox: "0 0 400 154.4",
  /** @param {URL} url */
  parse(url) {
    return {
      // TODO: this Regex is not what it means to be, fix it!
      itemId: url.pathname.match(/\/([^zbozi\/]+)\//)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const grizlyCz = {
  name: "Grizly.cz",
  currency: "CZK",
  logo: "grizly_logo",
  url: "https://www.grizly.cz/",
  viewBox: "0 0 209 56",
  /** @param {URL} url */
  parse(url) {
    return {
      get itemId() {
        return this.itemUrl;
      },
      itemUrl: url.pathname.substring(1)
    };
  }
};

const grizlySk = {
  name: "Grizly.sk",
  currency: "EUR",
  logo: "grizly_logo",
  url: "https://www.grizly.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      get itemId() {
        return this.itemUrl;
      },
      itemUrl: url.pathname.substring(1)
    };
  }
};

const hornbachCz = {
  name: "Hornbach.cz",
  currency: "CZK",
  logo: "hornbach_logo",
  url: "https://www.hornbach.cz/",
  viewBox: "0 0 1102.072 183.77",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/\/(\d+)\//)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const hornbachSk = {
  name: "Hornbach.sk",
  currency: "EUR",
  logo: "hornbach_logo",
  url: "https://www.hornbach.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/\/(\d+)\//)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const iGlobusCz = {
  name: "iGlobus.cz",
  currency: "CZK",
  logo: "iglobus_logo",
  url: "https://shop.iglobus.cz/",
  viewBox: "0 0 1236.8 779.8",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/\/[^/]+\/([^/]+)$/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const ikeaCz = {
  name: "IKEA.cz",
  currency: "CZK",
  logo: "ikea_logo",
  url: "https://www.ikea.com/cz/cs/",
  viewBox: "0 0 400 160.15625",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/(\d+)\//)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const ikeaSk = {
  name: "IKEA.sk",
  currency: "EUR",
  logo: "ikea_logo",
  url: "https://www.ikea.com/sk/sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/(\d+)\//)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const iTescoCz = {
  name: "iTesco.cz",
  currency: "CZK",
  logo: "itesco_logo",
  url: "https://www.itesco.cz/",
  viewBox: "0 0 55 18",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/(\d+)$/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const iTescoSk = {
  name: "iTesco.sk",
  currency: "EUR",
  logo: "itesco_sk_logo",
  url: "https://www.itesco.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/(\d+)$/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const kauflandCz = {
  name: "Kaufland.cz",
  currency: "CZK",
  logo: "kaufland_logo",
  url: "https://www.kaufland.cz/",
  viewBox: "0 0 2468.5 681.2",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.split("/").at(-2),
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const knihydobrovskyCz = {
  name: "KnihyDobrovský.cz",
  currency: "CZK",
  logo: "knihydobrovsky_logo",
  url: "https://www.knihydobrovsky.cz/",
  viewBox: "0 0 220 54",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.match(/[^\\\/]+$/g)?.[0]
    };
  }
};

const kosikCz = {
  name: "Košík.cz",
  currency: "CZK",
  logo: "kosik_logo",
  url: "https://www.kosik.cz/",
  viewBox: "0 0 71 22",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.match(/[^/]+$/)?.[0]
    };
  }
};

const lekarnaCz = {
  name: "Lékárna.cz",
  currency: "CZK",
  logo: "lekarna_logo",
  url: "https://www.lekarna.cz/",
  viewBox: "0 0 79 20",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/(?:[^/]+\/)?([^/]+)/)?.[1]
    };
  }
};

const lidlCz = {
  name: "Lidl.cz",
  currency: "CZK",
  logo: "lidl_logo",
  url: "https://www.lidl.cz/",
  viewBox: "0 0 449.733 179.907",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/\/p(\d+)/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const luxorCz = {
  name: "Luxor.cz",
  currency: "CZK",
  logo: "luxor_logo",
  url: "https://www.luxor.cz/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/[^\/]+$/)?.[0]
    };
  }
};

const mallCz = {
  name: "Mall.cz",
  currency: "CZK",
  logo: "mall_logo",
  url: "https://www.mall.cz/",
  viewBox: "0 0 68 19",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/[^/]+$/)?.[0]
    };
  }
};

const mallSk = {
  name: "Mall.sk",
  currency: "EUR",
  logo: "mall_sk_logo",
  url: "https://www.mall.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/[^/]+$/)?.[0]
    };
  }
};

const magapixelCz = {
  name: "Megapixel.cz",
  currency: "CZK",
  logo: "megapixel_logo",
  url: "https://www.megapixel.cz/",
  viewBox: "0 0 180 180",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.href
        .substring(1)
        .match(/[^\/]+$/)?.[0]
        ?.replaceAll("?", "_")
    };
  }
};

const makroCz = {
  name: "makro.cz",
  currency: "CZK",
  logo: "makro_logo",
  url: "https://www.makro.cz/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/(\d+)p\//)?.[1]
    };
  }
};

const mironetCz = {
  name: "Mironet.cz",
  currency: "CZK",
  logo: "mironet_logo",
  url: "https://www.mironet.cz/",
  viewBox: "0 0 186 64",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.replace(/\//g, "")
    };
  }
};

const mountfieldCz = {
  name: "Mountfield.cz",
  currency: "CZK",
  logo: "mountfield_logo",
  url: "https://www.mountfield.cz/",
  viewBox: "0 0 64 11",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/-([^-]+)$/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const mountfieldSk = {
  name: "Mountfield.sk",
  currency: "EUR",
  logo: "mountfield_sk_logo",
  url: "https://www.mountfield.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/-([^-]+)$/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const notinoCz = {
  name: "Notino.cz",
  currency: "CZK",
  logo: "notino_logo",
  url: "https://www.notino.cz/",
  viewBox: "0 0 68 13",
  /** @param {URL} url */
  parse(url) {
    const itemUrl = url.pathname.split("/").filter(Boolean).slice(-1)[0];
    const itemId = itemUrl.match(/p-(\d+)/)?.[1];
    return { itemId, itemUrl };
  }
};

const notinoSk = {
  name: "Notino.sk",
  currency: "EUR",
  logo: "notino_sk_logo",
  url: "https://www.notino.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    const itemUrl = url.pathname.split("/").filter(Boolean).slice(-1)[0];
    const itemId = itemUrl.match(/p-(\d+)/)?.[1];
    return { itemId, itemUrl };
  }
};

const obiCz = {
  name: "OBI.cz",
  currency: "CZK",
  logo: "obi_logo",
  url: "https://www.obi.cz/",
  viewBox: "0 0 400 99.375",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/p\/(\d+)(#\/)?$/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const obiSk = {
  name: "OBI.sk",
  currency: "EUR",
  logo: "obi_logo",
  url: "https://www.obi.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/p\/(\d+)(#\/)?$/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const okayCz = {
  name: "Okay.cz",
  currency: "CZK",
  logo: "okay_logo",
  url: "https://www.okay.cz/",
  viewBox: null, //"0 0 53 20",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.match(/[^\/]+$/g)?.[0]
    };
  }
};

const okaySk = {
  name: "Okay.sk",
  currency: "EUR",
  logo: "okay_sk_logo",
  url: "https://www.okay.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.match(/[^\/]+$/g)?.[0]
    };
  }
};

const pilulkaCz = {
  name: "Pilulka.cz",
  currency: "CZK",
  logo: "pilulka_logo",
  url: "https://www.pilulka.cz/",
  viewBox: "0 0 86 20",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.match(/\/([^/]+)/)?.[1]
    };
  }
};

const pilulkaSk = {
  name: "Pilulka.sk",
  currency: "EUR",
  logo: "pilulka_sk_logo",
  url: "https://www.pilulka.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.match(/\/([^/]+)/)?.[1]
    };
  }
};

const rohlikCz = {
  name: "Rohlík.cz",
  currency: "CZK",
  logo: "rohlik_logo",
  url: "https://www.rohlik.cz/",
  viewBox: "0 0 51 28",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId:
        url.searchParams.get("productPopup")?.match(/^(\d+)/)?.[1] ?? url.pathname.substring(1).match(/^(\d+)/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const smartyCz = {
  name: "Smarty.cz",
  currency: "CZK",
  logo: "smarty_logo",
  url: "https://www.smarty.cz",
  viewBox: "0 0 178 30",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/-p(\d+)$/)?.[1],
      itemUrl: url.protocol + "//" + url.host + url.pathname // canonical url without query params
    };
  }
};

const tetadrogerieCz = {
  name: "Teta Drogerie",
  currency: "CZK",
  logo: "teta_logo",
  url: "https://www.tetadrogerie.cz/",
  viewBox: "0 0 1744 436",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.replace("/eshop/katalog/", "")
    };
  }
};

function tchiboItemUrl(url) {
  let itemUrl = url.pathname.substring(1).match(/([^/]+)\.html$/)?.[1]; // old format (can be used in some countries)
  if (!itemUrl) {
    const [id, slug] = url.pathname.split("/").slice(-2);
    itemUrl = `${slug}-p${id}`;
  }
  return itemUrl;
}

const tchiboCz = {
  name: "Tchibo.cz",
  currency: "CZK",
  logo: "tchibo_logo",
  url: "https://www.tchibo.cz/",
  viewBox: "0 0 400 164",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: tchiboItemUrl(url)
    };
  }
};

const tchiboSk = {
  name: "Tchibo.sk",
  currency: "EUR",
  logo: "tchibo_logo",
  url: "https://www.tchibo.sk/",
  viewBox: null,
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: null,
      itemUrl: tchiboItemUrl(url)
    };
  }
};

const tsbohemiaCz = {
  name: "TSBohemia.cz",
  currency: "CZK",
  logo: "tsbohemia_logo",
  url: "https://www.tsbohemia.cz/",
  viewBox: "0 0 115 15",
  /** @param {URL} url */
  parse(url) {
    return {
      itemId: url.pathname.match(/d(\d+)\.html/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

/**
 * Lookup of supported Shops
 *
 * If there is no logo yet, set the `viewBox` to `null`.
 * Any other property will render empty space on page.
 *
 * This map is also used for listing of supported shops on the homepage.
 * The order matters! Keep it in alphabetical order.
 * Listed are only the ones with string `viewBox` property value.
 *
 * @type {Map<string, ShopDefinition>}
 */
export const shops = new Map([
  ["4camping.cz", forCampingCz],
  ["4camping_cz", forCampingCz],
  ["4camping.sk", forCampingSk],
  ["4camping_sk", forCampingSk],
  ["aaaauto", aaaautoCz],
  ["aaaauto.cz", aaaautoCz],
  ["aaaauto_sk", aaaautoSk],
  ["aaaauto.sk", aaaautoSk],
  ["albert.cz", albertCz],
  ["albert_cz", albertCz],
  ["alza", alzaCz],
  ["allegro_cz", allegroCz],
  ["allegro.cz", allegroCz],
  ["alza.cz", alzaCz],
  ["alza_sk", alzaSk],
  ["alza.sk", alzaSk],
  ["autoesa.cz", autoEsaCz],
  ["autoesa_cz", autoEsaCz],
  ["benu", benuCz],
  ["benu.cz", benuCz],
  ["billa.cz", billaCz],
  ["billa_cz", billaCz],
  ["datart", datartCz],
  ["datart.cz", datartCz],
  ["datart_sk", datartSk],
  ["datart.sk", datartSk],
  ["dm_cz", dmCz],
  ["dm.cz", dmCz],
  ["drmax.cz", drmaxCz],
  ["drmax_cz", drmaxCz],
  ["drmax.sk", drmaxSk],
  ["drmax_sk", drmaxSk],
  ["mojadm_sk", mojaDmSk],
  ["mojadm.sk", mojaDmSk],
  ["eva_cz", evaCz],
  ["eva.cz", evaCz],
  ["grizly_cz", grizlyCz],
  ["grizly.cz", grizlyCz],
  ["grizly_sk", grizlySk],
  ["grizly.sk", grizlySk],
  ["hornbach", hornbachCz],
  ["hornbach_cz", hornbachCz],
  ["hornbach.cz", hornbachCz],
  ["hornbach_sk", hornbachSk],
  ["hornbach.sk", hornbachSk],
  ["iglobus", iGlobusCz],
  ["globus_cz", iGlobusCz],
  ["iglobus.cz", iGlobusCz],
  ["ikea_cz", ikeaCz],
  ["ikea.cz", ikeaCz],
  ["ikea_sk", ikeaSk],
  ["ikea.sk", ikeaSk],
  ["itesco", iTescoCz],
  ["itesco.cz", iTescoCz],
  ["itesco_sk", iTescoSk],
  ["itesco.sk", iTescoSk],
  ["kaufland_cz", kauflandCz],
  ["kaufland.cz", kauflandCz],
  ["knihydobrovsky_cz", knihydobrovskyCz],
  ["knihydobrovsky.cz", knihydobrovskyCz],
  ["kosik", kosikCz],
  ["kosik.cz", kosikCz],
  ["lekarna", lekarnaCz],
  ["lekarna.cz", lekarnaCz],
  ["lidl_cz", lidlCz],
  ["lidl.cz", lidlCz],
  ["luxor_cz", luxorCz],
  ["luxor.cz", luxorCz],
  ["makro", makroCz],
  ["makro.cz", makroCz],
  ["mall", mallCz],
  ["mall.cz", mallCz],
  ["mall_sk", mallSk],
  ["mall.sk", mallSk],
  ["megapixel_cz", magapixelCz],
  ["megapixel.cz", magapixelCz],
  ["mironet", mironetCz],
  ["mironet.cz", mironetCz],
  ["mountfield", mountfieldCz],
  ["mountfield.cz", mountfieldCz],
  ["mountfield_sk", mountfieldSk],
  ["mountfield.sk", mountfieldSk],
  ["notino", notinoCz],
  ["notino.cz", notinoCz],
  ["notino_sk", notinoSk],
  ["notino.sk", notinoSk],
  ["obi_cz", obiCz],
  ["obi.cz", obiCz],
  ["obi_sk", obiSk],
  ["obi.sk", obiSk],
  ["okay_cz", okayCz],
  ["okay.cz", okayCz],
  ["okay_sk", okaySk],
  ["okay.sk", okaySk],
  ["pilulka", pilulkaCz],
  ["pilulka.cz", pilulkaCz],
  ["pilulka_sk", pilulkaSk],
  ["pilulka.sk", pilulkaSk],
  ["rohlik", rohlikCz],
  ["rohlik.cz", rohlikCz],
  ["smarty.cz", smartyCz],
  ["smarty_cz", smartyCz],
  ["tetadrogerie_cz", tetadrogerieCz],
  ["tetadrogerie.cz", tetadrogerieCz],
  ["tchibo_cz", tchiboCz],
  ["tchibo.cz", tchiboCz],
  ["tchibo_sk", tchiboSk],
  ["tchibo.sk", tchiboSk],
  ["tsbohemia", tsbohemiaCz],
  ["tsbohemia.cz", tsbohemiaCz]
]);

/**
 * Gets supported Shops as a tuples array of key and shop definition
 * @return {[string, ShopDefinition][]}
 */
export function shopsEntriesArray(mapFn) {
  return Array.from(shops.entries(), mapFn);
}

/**
 * Gets unique entries of supported shops
 * @returns {Generator<ShopDefinition>}
 */
export function* supportedShops() {
  const returned = new Set();
  for (const shop of shops.values()) {
    if (returned.has(shop.url)) continue;
    returned.add(shop.url);
    yield shop;
  }
}

export function shopsArray() {
  return Array.from(supportedShops());
}

const twoLevelTLDs = new Set(["uk", "ua", "tr"]);
const countryInUrl = new Set(["ikea"]);

/**
 * Creates internal name representation for lookups and DB key composition.
 * @param {string} s URL like string
 * @param {Object} options
 * @returns {string | null}
 */
export function shopName(s, options = {}) {
  const { getFullKey = false } = options;
  const url = new URL(s);
  const domainParts = url.host.split(".");
  let domain = domainParts.pop();
  let shopName = domainParts.pop();
  if (twoLevelTLDs.has(domain)) {
    domain = `${shopName}_${domain}`;
    shopName = domainParts.pop();
  }
  if (countryInUrl.has(shopName)) {
    domain = url.pathname.split("/")[1];
  }

  const fullKey = `${shopName}_${domain}`;

  if (getFullKey) return fullKey;
  if (shops.get(fullKey)) return fullKey;
  if (shops.get(shopName)) return shopName;
  return null;
}

/**
 * Creates internal name representation for lookups.
 * @param {string | URL} s URL or URL like string
 * @returns {string}
 */
export function shopOrigin(s) {
  const url = new URL(s);
  const domainParts = url.host.split(".");
  let domain = domainParts.pop();
  let shopName = domainParts.pop();
  if (twoLevelTLDs.has(domain)) {
    domain = `${shopName}.${domain}`;
    shopName = domainParts.pop();
  }
  if (countryInUrl.has(shopName)) {
    domain = url.pathname.split("/")[1];
  }
  return `${shopName}.${domain}`;
}

/**
 * @param {string} detailUrl
 * @returns {ItemDetails | null}
 */
export function parseItemDetails(detailUrl) {
  const origin = shopOrigin(detailUrl);
  let shop = shops.get(origin);
  if (!shop) return null;
  const { key, currency, name: title, parse } = shop;
  const name = shopName(detailUrl);
  return {
    key: key ?? name,
    origin,
    title,
    currency,
    ...parse(new URL(detailUrl))
  };
}

/**
 * @param {ShopParams} params
 * @returns {string}
 */
export function shopHost(params) {
  const url = new URL(decodeURIComponent(params?.url));
  return url.hostname;
}

/**
 * Gets product slug from given URL.
 * @param {*} input The absolute or relative input URL to parse. If input is relative, then base is required. If input is absolute, the base is ignored. If input is not a string, it is converted to a string first.
 * @param {string|URL} [base] The base URL to resolve against if the input is not absolute. If base is not a string, it is converted to a string first.
 * @returns {string}
 */
export function itemSlug(input, base) {
  const url = new URL(input, base);
  const shop = shops.get(shopOrigin(url));
  const parsed = shop.parse(url);
  return parsed.itemId ? parsed.itemId : parsed.itemUrl;
}
