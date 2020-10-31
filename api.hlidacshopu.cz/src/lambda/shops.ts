import { DynamoDB } from "aws-sdk";
import { getMetadata, pkey } from "./product-detail";

export class ShopError extends Error {}

export abstract class Shop {
  protected url: URL;
  public metadata: any;

  protected constructor(
    protected params: ShopParams,
    protected dynamodb?: DynamoDB.DocumentClient
  ) {
    this.url = new URL(decodeURIComponent(params.url));
  }

  abstract get name(): string;

  abstract get itemUrl(): string | null | undefined;

  get itemId(): string | null | undefined {
    return null;
  }

  async getMetadata() {
    if (this.metadata) {
      return this.metadata;
    }

    const itemUrl = this.itemUrl;
    if (!itemUrl) {
      throw new ShopError("getMetadata: itemUrl not found");
    }

    const itemId = this.params.itemId || this.itemId;
    if (!this.dynamodb) throw new Error("Uninitialized DynamoDB client");
    this.metadata = getMetadata(this.dynamodb, this.name, itemUrl, itemId);
    return this.metadata;
  }

  async pkey() {
    const name = this.name;
    let itemId = null;
    if (this.params.itemId) {
      itemId = this.params.itemId;
    }
    if (!itemId) {
      itemId = this.itemId;
    }
    if (!itemId) {
      const metadata = await this.getMetadata();
      itemId = metadata.itemId;
    }
    if (!itemId) {
      throw new ShopError("no itemId found");
    }

    return pkey(name, itemId);
  }
}

class AAAAuto extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "aaaauto";
  }

  get itemUrl() {
    return this.url?.searchParams.get("id");
  }

  get itemId() {
    return this.itemUrl;
  }
}

class Alza extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "alza";
  }

  get itemUrl() {
    const match = this.url?.pathname.substr(1).match(/[^\/]+$/);
    return match?.[0]?.replace(".htm", "") ?? this.url?.pathname.substr(1);
  }

  get itemId() {
    const match = this.url?.pathname.match(/d(\d+)\./);
    return match?.[1] ?? this.url?.searchParams.get("dq");
  }
}

class AlzaSk extends Alza {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "alza_sk";
  }
}

class Mall extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "mall";
  }

  get itemUrl() {
    const match = this.url?.pathname.substr(1).match(/[^/]+$/);
    return match?.[0];
  }
}

class MallSk extends Mall {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "mall_sk";
  }
}

class Czc extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
    this.params.itemId = this.params.itemId?.replace("a", "");
  }

  get name() {
    return "czc";
  }

  get itemUrl() {
    return this.itemId;
  }

  get itemId() {
    const match = this.url?.pathname.match(/\/(\d+)a?\//);
    return match?.[1]?.replace("a", "");
  }
}

class Mironet extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "mironet";
  }

  get itemUrl() {
    return this.url?.pathname.replace(/\//g, "");
  }
}

class Datart extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "datart";
  }

  get itemUrl() {
    const match = this.url?.pathname.substr(1).match(/([^\/]+)\.html$/);
    return match?.[1];
  }
}

class Itesco extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "itesco";
  }

  get itemUrl() {
    return this.itemId;
  }

  get itemId() {
    const match = this.url?.pathname.match(/(\d+)$/);
    return match?.[1];
  }
}

class Rohlik extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "rohlik";
  }

  get itemUrl() {
    return this.itemId;
  }

  get itemId() {
    let item = this.url?.searchParams.get("productPopup");
    if (!item) item = this.url?.pathname.substr(1);
    const match = item?.match(/^(\d+)/);
    return match?.[1];
  }
}

class Notino extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "notino";
  }

  get itemUrl() {
    const match = this.url?.pathname.substr(1).replace(/\//g, "");
    return match?.[1];
  }
}

class Tsbohemia extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "tsbohemia";
  }

  get itemUrl() {
    return this.itemId;
  }

  get itemId() {
    const match = this.url?.pathname.match(/d(\d+)\.html/);
    return match?.[1];
  }
}

class Kosik extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "kosik";
  }

  get itemUrl() {
    const match = this.url?.pathname.match(/[^/]+$/);
    return match?.[0];
  }
}

class Mountfield extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "mountfield";
  }

  get itemUrl() {
    return this.itemId;
  }

  get itemId() {
    const match = this.url?.pathname.match(/-([^-]+)$/);
    return match?.[1];
  }
}

class Lekarna extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "lekarna";
  }

  get itemUrl() {
    const match = this.url?.pathname.substr(1).match(/(?:[^\/]+\/)?([^\/]+)/);
    return match?.[1];
  }
}

class Kasa extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "kasa";
  }

  get itemUrl() {
    const match = this.url?.pathname.match(/\/([^\/]+)/);
    return match?.[1];
  }
}

class Benu extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "benu";
  }

  get itemUrl() {
    const match = this.url?.pathname.match(/\/([^\/]+)/);
    return match?.[1];
  }
}

class Pilulka extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "pilulka";
  }

  get itemUrl() {
    const match = this.url?.pathname.match(/\/([^\/]+)/);
    return match?.[1];
  }
}

class Prozdravi extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "prozdravi";
  }

  get itemUrl() {
    const match = this.url?.pathname.match(/\/([^\/]+)/);
    return match?.[1];
  }
}

class Sleky extends Shop {
  constructor(params: any, dynamodb: DynamoDB.DocumentClient) {
    super(params, dynamodb);
  }

  get name() {
    return "sleky";
  }

  get itemUrl() {
    const match = this.url?.pathname.match(/\/([^\/]+)/);
    return match?.[1];
  }
}

const shops = {
  "www.aaaauto.cz": AAAAuto,
  "www.aaaauto.sk": AAAAuto,
  "www.alza.cz": Alza,
  "m.alza.cz": Alza,
  "www.alza.sk": AlzaSk,
  "m.alza.sk": AlzaSk,
  "www.benu.cz": Benu,
  "www.czc.cz": Czc,
  "www.datart.cz": Datart,
  "nakup.itesco.cz": Itesco,
  "www.kasa.cz": Kasa,
  "www.kosik.cz": Kosik,
  "www.lekarna.cz": Lekarna,
  "www.mall.cz": Mall,
  "www.mall.sk": MallSk,
  "www.mironet.cz": Mironet,
  "www.mountfield.cz": Mountfield,
  "www.notino.cz": Notino,
  "www.pilulka.cz": Pilulka,
  "www.prozdravi.cz": Prozdravi,
  "www.rohlik.cz": Rohlik,
  "www.sleky.cz": Sleky,
  "www.tsbohemia.cz": Tsbohemia
};

export function createShop(
  params: ShopParams,
  dynamodb?: DynamoDB.DocumentClient
): Shop | undefined {
  const url = new URL(decodeURIComponent(params.url));
  // @ts-ignore
  const Klass = shops[url.hostname];
  return Klass ? new Klass(params, dynamodb) : null;
}

export interface ShopParams {
  api?: string;
  url: string;
  itemId?: string;
}
