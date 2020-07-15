const URL = require("url").URL;
const crypto = require("crypto");
const AWS = require("aws-sdk");
const logger = require("./lib/logger");

class ShopError extends Error {}

class Shop {
  constructor(params, dynamodb) {
    this.params = params;
    this.url = new URL(decodeURIComponent(this.params.url));
    this.dynamodb = dynamodb;
  }

  name() {
    throw new Error("Shop not implemented yet");
  }

  itemUrl() {
    return false;
  }

  itemId() {
    return false;
  }

  async getMetadata() {
    if (this.metadata) {
      return this.metadata;
    }

    const itemUrl = this.itemUrl();
    logger.debug("itemurl", itemUrl);
    if (!itemUrl) {
      throw new ShopError("getMetadata: itemUrl not found");
    }

    const pkey = `${this.name()}:${itemUrl}`;

    const itemId = this.params.itemId || this.itemId();
    const dbParams = {
      ExpressionAttributeValues: {
       ":pkey": { S: pkey }
      },
      KeyConditionExpression: "pkey = :pkey",
      TableName: "all_shops_metadata",
    };

    if (itemId) {
      dbParams.ExpressionAttributeValues[":itemId"] = { S: itemId };
      dbParams.KeyConditionExpression = "itemId = :itemId AND pkey = :pkey";
    }

    logger.debug({ type: "querying itemId", dbParams, name: this.name(), pkey, itemUrl, itemId });

    const res = await this.dynamodb.query(dbParams).promise();
    logger.debug({ type: "getMetadata", res });
    if (!res.Items) {
      throw new ShopError("metadata not found in dynamo");
    }
    const items = res.Items.map(item => AWS.DynamoDB.Converter.unmarshall(item));
    const metadata = items[0];
    logger.debug({ items, metadata });
    this.metadata = metadata;
    return metadata;
  }

  async pkey() {
    const name = this.name();
    let itemId = null;
    if (this.params.itemId) {
      itemId = this.params.itemId;
    }
    if (!itemId) {
      itemId = this.itemId();
    }
    if (!itemId) {
      const metadata = await this.getMetadata();
      itemId = metadata.itemId;
    }
    if (!itemId) {
      logger.error({ type: "no itemid found", itemId, name });
      throw new ShopError("no itemId found");
    }

    const hash = crypto.createHash("md5");
    const pkey = hash.update(`${name}${itemId}`).digest("hex");
    logger.info({ name, itemId, pkey });
    return pkey;
  }

  static create(params, dynamodb) {
    const url = new URL(decodeURIComponent(params.url));
    const args = [params, dynamodb];
    switch (url.hostname) {
      case "www.aaaauto.cz":
        return new AAAAuto(...args);
      case "www.alza.cz":
      case "m.alza.cz":
        return new Alza(...args);
      case "www.alza.sk":
      case "m.alza.sk":
        return new AlzaSk(...args);
      case "www.benu.cz":
        return new Benu(...args);
      case "www.czc.cz":
        return new Czc(...args);
      case "www.datart.cz":
        return new Datart(...args);
      //case "www.globus.cz":
      //  return new Globus(...args);
      case "nakup.itesco.cz":
        return new Itesco(...args);
      case "www.kasa.cz":
        return new Kasa(...args);
      case "www.kosik.cz":
        return new Kosik(...args);
      case "www.lekarna.cz":
        return new Lekarna(...args);
      case "www.mall.cz":
        return new Mall(...args);
      case "www.mall.sk":
        return new MallSk(...args);
      case "www.mironet.cz":
        return new Mironet(...args);
      case "www.mountfield.cz":
        return new Mountfield(...args);
       case "www.notino.cz":
        return new Notino(...args);
      case "www.pilulka.cz":
        return new Pilulka(...args);
      case "www.prozdravi.cz":
        return new Prozdravi(...args);
      case "www.rohlik.cz":
        return new Rohlik(...args);
      case "www.sleky.cz":
        return new Sleky(...args);
      case "www.tsbohemia.cz":
        return new Tsbohemia(...args);
    }
  }
}

class AAAAuto extends Shop {
  name() {
    return "aaaauto";
  }

  itemUrl() {
    return this.url.searchParams.get("id");
  }

  itemId() {
    return this.itemUrl();
  }
}

class Alza extends Shop {
  name() {
    return "alza";
  }

  itemUrl() {
     const match = this.url.pathname.substr(1).match(/[^\/]+$/);
     if (match && match[0]) {
       return match[0].replace(".htm", "");
     }
     return this.url.pathname.substr(1);
  }

  itemId() {
    const match = this.url.pathname.match(/d(\d+)\./);
    if (match && match[1]) {
      return match[1];
    }
    const dq = this.url.searchParams.get("dq");
    if (dq) {
      return dq;
    }
    return false;
  }
}

class AlzaSk extends Alza {
  name() {
    return "alza_sk";
  }
}

class Mall extends Shop {
  name() {
    return "mall";
  }

  itemUrl() {
    const match = this.url.pathname.substr(1).match(/[^/]+$/);
     if (match && match[0]) {
       return match[0];
     }
     return false;
  }
}

class MallSk extends Mall {
  name() {
    return "mall_sk";
  }
}

class Czc extends Shop {
  constructor(...args) {
    super(...args);
    if (this.params.itemId) {
      this.params.itemId = this.params.itemId.replace("a", "");
    }
  }

  name() {
    return "czc";
  }

  itemUrl() {
    return this.itemId();
  }

  itemId() {
    const match = this.url.pathname.match(/\/(\d+)a?\//);
    if (match && match[1]) {
      return match[1].replace("a", "");
    }
    return false;
  }
}

class Mironet extends Shop {
  name() {
    return "mironet";
  }

  itemUrl() {
    return this.url.pathname.replace(/\//g, "");
  }
}

class Datart extends Shop {
  name() {
    return "datart";
  }

  itemUrl() {
     const match = this.url.pathname.substr(1).match(/([^\/]+)\.html$/);
     if (match && match[1]) {
       return match[1];
     }
     return false;
  }
}

class Itesco extends Shop {
  name() {
    return "itesco";
  }

  itemUrl() {
    return this.itemId();
  }

  itemId() {
    const match = this.url.pathname.match(/(\d+)$/);
    if (match && match[1]) {
      return match[1];
    }
    return false;
  }
}

class Rohlik extends Shop {
  name() {
    return "rohlik";
  }

  itemUrl() {
    return this.itemId();
  }

  itemId() {
    let item = this.url.searchParams.get("productPopup");
    if (!item) item = this.url.pathname.substr(1);
    const match = item.match(/^(\d+)/);
    if (match && match[1]) {
      return match[1];
    }
    return false;
  }
}

class Notino extends Shop {
  name() {
    return "notino";
  }

  itemUrl() {
    const match = this.url.pathname.substr(1).replace(/\//g, "");
    if (match && match[1]) {
      return match[1];
    }
    return false;
  }
}

class Tsbohemia extends Shop {
  name() {
    return "tsbohemia";
  }

  itemUrl() {
    return this.itemId();
  }

  itemId() {
    const match = this.url.pathname.match(/d(\d+)\.html/);
    if (match && match[1]) {
      return match[1];
    }
    return false;
  }
}

class Kosik extends Shop {
  name() {
    return "kosik";
  }

  itemUrl() {
    const match = this.url.pathname.match(/[^/]+$/);
    if (match && match[0]) {
      return match[0];
    }
    return false;
  }
}

class Mountfield extends Shop {
  name() {
    return "mountfield";
  }

  itemUrl() {
    return this.itemId();
  }

  itemId() {
    const match = this.url.pathname.match(/-([^-]+)$/);
    if (match && match[1]) {
      return match[1];
    }
    return false;
  }
}

class Lekarna extends Shop {
  name() {
    return "lekarna";
  }

  itemUrl() {
    const match = this.url.pathname.substr(1).match(/(?:[^\/]+\/)?([^\/]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return false;
  }
}

class Kasa extends Shop {
  name() {
    return "kasa";
  }

  itemUrl() {
    const match = this.url.pathname.match(/\/([^\/]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return false;
  }
}

class Benu extends Shop {
  name() {
    return "benu";
  }

  itemUrl() {
    const match = this.url.pathname.match(/\/([^\/]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return false;
  }
}

class Pilulka extends Shop {
  name() {
    return "pilulka";
  }

  itemUrl() {
    const match = this.url.pathname.match(/\/([^\/]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return false;
  }
}

class Prozdravi extends Shop {
  name() {
    return "prozdravi";
  }

  itemUrl() {
    const match = this.url.pathname.match(/\/([^\/]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return false;
  }
}

class Sleky extends Shop {
  name() {
    return "sleky";
  }

  itemUrl() {
    const match = this.url.pathname.match(/\/([^\/]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return false;
  }
}

module.exports = {
  Shop,
  ShopError,
};

