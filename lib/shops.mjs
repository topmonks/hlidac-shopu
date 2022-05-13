/**
 * @typedef { import("./types").ItemDetails } ItemDetails
 * @typedef { import("./types").ShopDefinition } ShopDefinition
 * @typedef { import("./types").ShopParams } ShopParams
 */

const aaaautoCz = {
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

const aaaautoSk = {
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

const alzaCz = {
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

const alzaSk = {
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

const alzaCoUk = {
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

const alzaAt = {
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

const alzaHu = {
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

const alzaDe = {
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

const benuCz = {
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

const czcCz = {
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

const conradCz = {
  name: "Conrad.cz",
  currency: "CZK",
  logo: "conrad_logo",
  url: "https://www.conrad.cz/",
  viewBox: null,
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/[^-]+$/)?.[0]
    };
  }
};

const datartCz = {
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

const datartSk = {
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

const dmCz = {
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

const mojaDmSk = {
  key: "dm_sk",
  name: "mojaDM.sk",
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

const dmDe = {
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

const dmAt = {
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

const dmPl = {
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

const dmHu = {
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

const eCoopCz = {
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

const electroworldCz = {
  name: "ElectroWorld.cz",
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

const evaCz = {
  name: "EVA.cz",
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

const iGlobusCz = {
  name: "iGlobus.cz",
  currency: "CZK",
  logo: "iglobus_logo",
  url: "https://shop.iglobus.cz/",
  viewBox: null,
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
  parse(url) {
    return {
      itemId: url.pathname.match(/(\d+)\//)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const ikeaPl = {
  name: "IKEA.pl",
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

const ikeaAt = {
  name: "IKEA.at",
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

const ikeaDe = {
  name: "IKEA.de",
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

const ikeaHu = {
  name: "IKEA.hu",
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

const iTescoCz = {
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

const iTescoSk = {
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

const kasaCz = {
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

const knihydobrovskyCz = {
  name: "KnihyDobrovský.cz",
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

const kosikCz = {
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

const lekarnaCz = {
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

const lidlCz = {
  name: "Lidl.cz",
  currency: "CZK",
  logo: "lidl_logo",
  url: "https://www.lidl.cz/",
  viewBox: "0 0 449.733 179.907",
  parse(url) {
    return {
      itemId: url.pathname.match(/\/p(\d+)/)?.[1],
      get itemUrl() {
        return this.itemId;
      }
    };
  }
};

const tchiboCz = {
  name: "Tchibo.cz",
  currency: "CZK",
  logo: "tchibo_logo",
  url: "https://www.tchibo.cz/",
  viewBox: "0 0 400 164",
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).match(/([^/]+)\.html$/)?.[1]
    };
  }
};

const tchiboSk = {
  name: "Tchibo.sk",
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

const mallCz = {
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

const mallSk = {
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

const magapixelCz = {
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

const luxorCz = {
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

const mironetCz = {
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

const mountfieldCz = {
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

const dekCz = {
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

const dekSk = {
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

const mountfieldSk = {
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

const hornbachCz = {
  name: "Hornbach.cz",
  currency: "CZK",
  logo: "hornbach_logo",
  url: "https://www.hornbach.cz/",
  viewBox: "0 0 1102.072 183.77",
  parse(url) {
    return {
      itemId: url.pathname.match(/(\d+)\/artikl.html/)?.[1],
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
  parse(url) {
    return {
      itemId: url.pathname.match(/(\d+)\/artikel.html/)?.[1],
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
  parse(url) {
    return {
      itemId: null,
      itemUrl: url.pathname.substring(1).replace(/\//g, "")?.[1]
    };
  }
};

const notinoSk = {
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

const obiCz = {
  name: "OBI.cz",
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

const obiSk = {
  name: "OBI.sk",
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

const obiPl = {
  name: "OBI.sk",
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

const obiHu = {
  name: "OBI.sk",
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

const obiItaliaIt = {
  name: "OBI-italia.it",
  currency: "EUR",
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

const obiDe = {
  name: "OBI.de",
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

const obiAt = {
  name: "OBI.at",
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

const obiRu = {
  name: "OBI.ru",
  currency: "RUB",
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

const obiCh = {
  name: "OBI.ch",
  currency: "HRK",
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

const okayCz = {
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

const okaySk = {
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

const pilulkaCz = {
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

const pilulkaSk = {
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

const prozdraviCz = {
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

const rohlikCz = {
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

const rozetkaComUa = {
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

const sLekyCz = {
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

const tetadrogerieCz = {
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

const tsbohemiaCz = {
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

const makroCz = {
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
  ["conrad.cz", conradCz],
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
  ["globus_cz", iGlobusCz],
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

export function itemSlug(s) {
  const url = new URL(s);
  const shop = shops.get(shopOrigin(url));
  const parsed = shop.parse(url);
  return parsed.itemId ? parsed.itemId : parsed.itemUrl;
}
