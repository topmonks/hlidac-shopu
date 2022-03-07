/**
 * @typedef { import("./types").ItemDetails } ItemDetails
 * @typedef { import("./types").ShopDefinition } ShopDefinition
 * @typedef { import("./types").ShopParams } ShopParams
 */

let aaaautoCz = {
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
};
let aaaautoSk = {
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
};
let alzaCz = {
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
          .substring(1)
          .match(/[^/]+$/)?.[0]
          .replace(".htm", "") ?? url.pathname.substring(1)
    };
  }
};
let alzaSk = {
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
          .substring(1)
          .match(/[^/]+$/)?.[0]
          .replace(".htm", "") ?? url.pathname.substring(1)
    };
  }
};
let alzaCoUk = {
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
          .substring(1)
          .match(/[^/]+$/)?.[0]
          .replace(".htm", "") ?? url.pathname.substring(1)
    };
  }
};
let alzaAt = {
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
          .substring(1)
          .match(/[^/]+$/)?.[0]
          .replace(".htm", "") ?? url.pathname.substring(1)
    };
  }
};
let alzaHu = {
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
          .substring(1)
          .match(/[^/]+$/)?.[0]
          .replace(".htm", "") ?? url.pathname.substring(1)
    };
  }
};
let alzaDe = {
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
          .substring(1)
          .match(/[^/]+$/)?.[0]
          .replace(".htm", "") ?? url.pathname.substring(1)
    };
  }
};
let benuCz = {
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
};
let czcCz = {
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
};
let datartCz = {
  name: "Datart.cz",
  currency: "CZK",
  logo: "datart_logo",
  url: "https://www.datart.cz/",
  viewBox: "0 0 98 13",
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/([^/]+)\.html$/)?.[1]
    };
  }
};
let datartSk = {
  name: "Datart.sk",
  currency: "EUR",
  logo: "datart_sk_logo",
  url: "https://www.datart.sk/",
  viewBox: null,
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/([^/]+)\.html$/)?.[1]
    };
  }
};
let dmCz = {
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
};
let mojaDmSk = {
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
};
let dmDe = {
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
};
let dmAt = {
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
};
let dmPl = {
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
};
let dmHu = {
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
};
let eCoopCz = {
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
};
let electroworldCz = {
  name: "electroworld.cz",
  currency: "CZK",
  logo: "electroworld_logo",
  url: "https://www.electroworld.cz/",
  viewBox: "0 0 745.79 113.39",
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.match(/\/([^\/]+)/)?.[1]
    };
  }
};
let evaCz = {
  name: "eva.cz",
  currency: "CZK",
  logo: "eva_logo",
  url: "https://www.eva.cz/",
  viewBox: "0 0 400 154.4",
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
let iGlobusCz = {
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
};
let ikeaCz = {
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
};
let ikeaSk = {
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
};
let ikeaPl = {
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
};
let ikeaAt = {
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
};
let ikeaDe = {
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
};
let ikeaHu = {
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
};
let iTescoCz = {
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
};
let iTescoSk = {
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
};
let kasaCz = {
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
};
let knihydobrovskyCz = {
  name: "knihydobrovsky.cz",
  currency: "CZK",
  logo: "knihydobrovsky_logo",
  url: "https://www.knihydobrovsky.cz/",
  viewBox: "0 0 220 54",
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.match(/[^\\\/]+$/g)?.[0]
    };
  }
};
let kosikCz = {
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
};
let lekarnaCz = {
  name: "Lékárna.cz",
  currency: "CZK",
  logo: "lekarna_logo",
  url: "https://www.lekarna.cz/",
  viewBox: "0 0 79 20",
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/(?:[^/]+\/)?([^/]+)/)?.[1]
    };
  }
};
let lidlCz = {
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
};
let tchiboCz = {
  name: "tchibo.cz",
  currency: "CZK",
  logo: "tchibo_logo",
  url: "https://www.tchibo.cz/",
  viewBox: "0 0 400 400",
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/([^/]+)\.html$/)?.[1]
    };
  }
};
let tchiboSk = {
  name: "tchibo.sk",
  currency: "EUR",
  logo: "tchibo_logo",
  url: "https://www.tchibo.sk/",
  viewBox: null,
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/([^/]+)\.html$/)?.[1]
    };
  }
};
let mallCz = {
  name: "Mall.cz",
  currency: "CZK",
  logo: "mall_logo",
  url: "https://www.mall.cz/",
  viewBox: "0 0 68 19",
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/[^/]+$/)?.[0]
    };
  }
};
let mallSk = {
  name: "Mall.sk",
  currency: "EUR",
  logo: "mall_sk_logo",
  url: "https://www.mall.sk/",
  viewBox: null,
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/[^/]+$/)?.[0]
    };
  }
};
let magapixelCz = {
  name: "Megapixel.cz",
  currency: "CZK",
  logo: "megapixel_logo",
  url: "https://www.megapixel.cz/",
  viewBox: null,
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/[^\/]+$/)?.[0]
    };
  }
};
let luxorCz = {
  name: "Luxor.cz",
  currency: "CZK",
  logo: "luxor_logo",
  url: "https://www.luxor.cz/",
  viewBox: null,
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/[^\/]+$/)?.[0]
    };
  }
};
let mironetCz = {
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
};
let mountfieldCz = {
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
};
let dekCz = {
  name: "Dek.cz",
  currency: "CZK",
  logo: "dek_logo",
  url: "https://www.dek.cz/",
  viewBox: null,
  parse(url) {
    return {
      itemId: url.pathname.match(/\/(\d+)-/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};
let dekSk = {
  name: "Dek.sk",
  currency: "EUR",
  logo: "dek_logo",
  url: "https://www.dek.sk/",
  viewBox: null,
  parse(url) {
    return {
      itemId: url.pathname.match(/\/(\d+)-/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};
let mountfieldSk = {
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
};
let hornbachCz = {
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
};
let hornbachSk = {
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
};
let notinoCz = {
  name: "Notino.cz",
  currency: "CZK",
  logo: "notino_logo",
  url: "https://www.notino.cz/",
  viewBox: "0 0 68 13",
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).replace(/\//g, "")?.[1]
    };
  }
};
let notinoSk = {
  name: "Notino.sk",
  currency: "EUR",
  logo: "notino_sk_logo",
  url: "https://www.notino.sk/",
  viewBox: null,
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).replace(/\//g, "")?.[1]
    };
  }
};
let obiCz = {
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
};
let obiSk = {
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
};
let obiPl = {
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
};
let obiHu = {
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
};
let obiItaliaIt = {
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
};
let obiDe = {
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
};
let obiAt = {
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
};
let obiRu = {
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
};
let obiCh = {
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
};
let okayCz = {
  name: "Okay.cz",
  currency: "CZK",
  logo: "okay_logo",
  url: "https://www.okay.cz/",
  viewBox: "0 0 53 20",
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.match(/[^\/]+$/g)?.[0]
    };
  }
};
let okaySk = {
  name: "Okay.sk",
  currency: "EUR",
  logo: "okay_sk_logo",
  url: "https://www.okay.sk/",
  viewBox: null,
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.match(/[^\/]+$/g)?.[0]
    };
  }
};
let pilulkaCz = {
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
};
let pilulkaSk = {
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
};
let prozdraviCz = {
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
};
let rohlikCz = {
  name: "Rohlík.cz",
  currency: "CZK",
  logo: "rohlik_logo",
  url: "https://www.rohlik.cz/",
  viewBox: "0 0 51 28",
  parse(url) {
    return {
      itemId:
        url.searchParams.get("productPopup")?.match(/^(\d+)/)?.[1] ??
        url.pathname.substring(1).match(/^(\d+)/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};
let rozetkaComUa = {
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
};
let sLekyCz = {
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
};
let tetadrogerieCz = {
  name: "Teta Drogerie",
  currency: "CZK",
  logo: "teta_logo",
  url: "https://www.tetadrogerie.cz/",
  viewBox: "0 0 1744 436",
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.replace("/eshop/katalog/", "")
    };
  }
};
let tsbohemiaCz = {
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
};
let makroCz = {
  name: "makro.cz",
  currency: "CZK",
  logo: "makro_logo",
  url: "https://www.makro.cz/",
  viewBox: null,
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/(\d+)p\//)?.[1]
    };
  }
};
/**
 * Lookup of supported Shops
 *
 * If there is no logo yet, set the `viewBox` to `null`.
 * Any other property will render empty space on page.
 *
 * @type {Map<string, ShopDefinition>}
 */
export const shops = new Map([
  ["aaaauto", aaaautoCz],
  ["aaaauto.cz", aaaautoCz],
  ["aaaauto_sk", aaaautoSk],
  ["aaaauto.sk", aaaautoSk],
  ["alza", alzaCz],
  ["alza.cz", alzaCz],
  ["alza_sk", alzaSk],
  ["alza.sk", alzaSk],
  ["alza_uk", alzaCoUk],
  ["alza.co.uk", alzaCoUk],
  ["alza_at", alzaAt],
  ["alza.at", alzaAt],
  ["alza_hu", alzaHu],
  ["alza.hu", alzaHu],
  ["alza_de", alzaDe],
  ["alza.de", alzaDe],
  ["benu", benuCz],
  ["benu.cz", benuCz],
  ["czc", czcCz],
  ["czc.cz", czcCz],
  ["datart", datartCz],
  ["datart.cz", datartCz],
  ["datart_sk", datartSk],
  ["datart.sk", datartSk],
  ["dek_cz", dekCz],
  ["dek.cz", dekCz],
  ["dek_sk", dekSk],
  ["dek.sk", dekSk],
  ["dm_cz", dmCz],
  ["dm.cz", dmCz],
  ["mojadm_sk", mojaDmSk],
  ["mojadm.sk", mojaDmSk],
  ["dm_de", dmDe],
  ["dm.de", dmDe],
  ["dm_at", dmAt],
  ["dm.at", dmAt],
  ["dm_pl", dmPl],
  ["dm.pl", dmPl],
  ["dm_hu", dmHu],
  ["dm.hu", dmHu],
  ["e-coop", eCoopCz],
  ["e-coop.cz", eCoopCz],
  ["electroworld_cz", electroworldCz],
  ["electroworld.cz", electroworldCz],
  ["eva_cz", evaCz],
  ["eva.cz", evaCz],
  ["hornbach", hornbachCz],
  ["hornbach.cz", hornbachCz],
  ["hornbach_sk", hornbachSk],
  ["hornbach.sk", hornbachSk],
  ["iglobus", iGlobusCz],
  ["iglobus.cz", iGlobusCz],
  ["ikea_cz", ikeaCz],
  ["ikea.cz", ikeaCz],
  ["ikea_sk", ikeaSk],
  ["ikea.sk", ikeaSk],
  ["ikea_pl", ikeaPl],
  ["ikea.pl", ikeaPl],
  ["ikea_at", ikeaAt],
  ["ikea.at", ikeaAt],
  ["ikea_de", ikeaDe],
  ["ikea.de", ikeaDe],
  ["ikea_hu", ikeaHu],
  ["ikea.hu", ikeaHu],
  ["itesco", iTescoCz],
  ["itesco.cz", iTescoCz],
  ["itesco_sk", iTescoSk],
  ["itesco.sk", iTescoSk],
  ["kasa", kasaCz],
  ["kasa.cz", kasaCz],
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
  ["obi_pl", obiPl],
  ["obi.pl", obiPl],
  ["obi_hu", obiHu],
  ["obi.hu", obiHu],
  ["obi-italia_it", obiItaliaIt],
  ["obi-italia.it", obiItaliaIt],
  ["obi_de", obiDe],
  ["obi.de", obiDe],
  ["obi_at", obiAt],
  ["obi.at", obiAt],
  ["obi_ru", obiRu],
  ["obi.ru", obiRu],
  ["obi_ch", obiCh],
  ["obi.ch", obiCh],
  ["okay_cz", okayCz],
  ["okay.cz", okayCz],
  ["okay_sk", okaySk],
  ["okay.sk", okaySk],
  ["pilulka", pilulkaCz],
  ["pilulka.cz", pilulkaCz],
  ["pilulka_sk", pilulkaSk],
  ["pilulka.sk", pilulkaSk],
  ["prozdravi", prozdraviCz],
  ["prozdravi.cz", prozdraviCz],
  ["rohlik", rohlikCz],
  ["rohlik.cz", rohlikCz],
  ["rozetka_com_ua", rozetkaComUa],
  ["rozetka.com.ua", rozetkaComUa],
  ["sleky", sLekyCz],
  ["sleky.cz", sLekyCz],
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
 * @param {Object} options
 * @returns {string | null}
 * @deprecated Use `shopOrigin` function
 */
export function shopName(s, options = {}) {
  const { getFullKey = false } = options;
  const url = new URL(s);
  const domainParts = url.host.split(".");
  let domain = domainParts.pop();
  let shopName = domainParts.pop();
  if (twoLevelTlds.has(domain)) {
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
  if (twoLevelTlds.has(domain)) {
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

export function itemSlug(s) {
  const url = new URL(s);
  const shop = shops.get(shopOrigin(url));
  return shop.parse(url).itemUrl;
}
