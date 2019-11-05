const URL = require("url").URL;
const crypto = require("crypto");
const AWS = require("aws-sdk");

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
    console.log("itemurl", itemUrl);
    if (!itemUrl) {
      throw new ShopError("getMetadata: itemUrl not found");
    }

    const pkey = `${this.name()}:${itemUrl}`;
    console.log({ type: "querying itemId", pkey, name: this.name(), itemUrl });

    const res = await this.dynamodb.getItem({
      Key: {
        "pkey": {
          S: pkey
        },
      },
      TableName: "all_shops_metadata",
    }).promise();
    console.log(JSON.stringify({ type: "getMetadata", res }));
    if (!res.Item) {
      throw new ShopError("metadata not found in dynamo");
    }
    const metadata = AWS.DynamoDB.Converter.unmarshall(res.Item);
    console.log({ metadata });
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
      console.log({ type: "no itemid found", itemId, name });
      throw new ShopError("no itemId found");
    }

    const hash = crypto.createHash("md5");
    const pkey = hash.update(`${name}${itemId}`).digest("hex");
    console.log({ name, itemId, pkey });
    return pkey;
  }

  static create(params, dynamodb) {
    const url = new URL(decodeURIComponent(params.url));
    const args = [params, dynamodb];
    switch (url.hostname) {
      case "www.alza.cz":
      case "m.alza.cz":
        return new Alza(...args);
      case "www.mall.cz":
        return new Mall(...args);
      case "www.czc.cz":
        return new Czc(...args);
      case "www.mironet.cz":
        return new Mironet(...args);
      case "www.datart.cz":
        return new Datart(...args);
      case "nakup.itesco.cz":
        return new Itesco(...args);
      case "www.rohlik.cz":
        return new Rohlik(...args);
      case "www.notino.cz":
        return new Notino(...args);
      case "www.tsbohemia.cz":
        return new Tsbohemia(...args);
      case "www.kosik.cz":
        return new Kosik(...args);
      case "www.mountfield.cz":
        return new Mountfield(...args);
      case "www.lekarna.cz":
        return new Lekarna(...args);
      case "www.kasa.cz":
        return new Kasa(...args);
    }
  }
}

class Alza extends Shop {
  name() {
    return "alza";
  }

  itemUrl() {
     const match = this.url.pathname.substr(1).match(/([^.\/]+)\.htm/);
     if (match && match[1]) {
       return match[1];
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

class Mall extends Shop {
  name() {
    return "mall";
  }

  itemUrl() {
    const match = this.url.pathname.substr(1).match(/(?:[^\/]+\/)?([^.]+)/);
     if (match && match[1]) {
       return match[1];
     }
     return false;
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
     const match = this.url.pathname.substr(1).match(/(?:[^\/]+\/)?([^.]+)/);
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
    const match = this.url.pathname.substr(1).match(/(?:[^\/]+\/)?([^\/]+)/);
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

module.exports = {
  Shop,
  ShopError,
};
