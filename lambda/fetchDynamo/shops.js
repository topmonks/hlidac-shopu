const URL = require("url").URL;
const crypto = require("crypto");

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

  async queryItemId() {
    const itemUrl = this.itemUrl();
    if (!itemUrl) {
      throw new ShopError("itemUrl not found");
    }

    console.log({ type: "querying itemId", name: this.name(), itemUrl });
    const res = await this.dynamodb.getItem({
      Key: {
        "itemUrl": {
          S: itemUrl
        },
      },
      TableName: "itemids",
    }).promise();
    console.log({ type: "queryItem", res });
    if (!res.Item) {
      throw new ShopError("itemid not found in dynamo");
    }
    return res.Item.itemId.S;
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
      itemId = await this.queryItemId();
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
    }
  }
}

class Alza extends Shop {
  name() {
    return "alza";
  }

  itemId() {
    const url = new URL(decodeURIComponent(this.params.url));
    const match = url.pathname.match(/d(\d+)\./);
    if (match && match[1]) {
      return match[1];
    }
    const dq = url.searchParams.get("dq");
    if (dq) {
      return dq;
    }
    throw new ShopError(`Cannot find itemId from ${this.params.url}`);
  }
}

class Mall extends Shop {
  name() {
    return "mall";
  }

  itemUrl() {
    const match = this.url.pathname.match(/[^/]+$/);
    if (match && match[0]) {
      return match[0];
    }
    throw new ShopError(`Cannot find itemId from ${this.params.url}`);
  }
}

class Czc extends Shop {
  name() {
    return "czc";
  }

  itemId() {
    const match = this.url.pathname.match(/\/(\d+)a?\//);
    if (match && match[1]) {
      return match[1];
    }
    throw new ShopError(`Cannot find itemId from ${this.params.url}`);
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
    return this.url.pathname.replace("/", "").replace(".html", "");
  }
}

class Itesco extends Shop {
  name() {
    return "itesco";
  }

  itemId() {
    const match = this.url.pathname.match(/(\d+)$/);
    if (match && match[1]) {
      return match[1];
    }
    throw new ShopError(`Cannot find itemId from ${this.params.url}`);
  }
}

class Rohlik extends Shop {
  name() {
    return "rohlik";
  }

  itemId() {
    const match = this.url.pathname.match(/^\/(\d+)/);
    if (match && match[1]) {
      return match[1];
    }
    throw new ShopError(`Cannot find itemId from ${this.params.url}`);
  }
}

class Notino extends Shop {
  name() {
    return "notino";
  }

  itemUrl() {
    const match = this.url.pathname.match(/\/[^/]+\/([^/]+(?:\/[^/]+)?)/);
    if (match && match[1]) {
      return match[1];
    }
    throw new ShopError(`couldnt get itemurl from notino (${this.url})`);
  }
}

class Tsbohemia extends Shop {
  name() {
    return "tsbohemia";
  }

  itemId() {
    const match = this.url.pathname.match(/d(\d+)\.html/);
    if (match && match[1]) {
      return match[1];
    }
    throw new ShopError(`Cannot find itemId from ${this.params.url}`);
  }
}

class Kosik extends Shop {
  name() {
    return "kosik";
  }

  itemUrl() {
    const url = decodeURIComponent(this.params.url);
    return url.replace("https://kosik.czhttps://www.kosik.cz/produkt/", "");
  }
}

class Mountfield extends Shop {
  name() {
    return "mountfield";
  }

  itemUrl() {
    return this.url.pathname.replace(/\//g, "");
  }
}

class Lekarna extends Shop {
  name() {
    return "lekarna";
  }

  itemUrl() {
    return this.url.pathname.replace(/\//g, "");
  }
}

module.exports = {
  Shop,
  ShopError,
};
