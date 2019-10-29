const URL = require("url").URL;
const crypto = require("crypto");

function getName(hostname) {
  switch (hostname) {
    case "www.alza.cz":
      return "alza";
    case "www.mall.cz":
      return "mall";
    case "www.czc.cz":
      return "czc";
    case "www.mironet.cz":
      return "mironet";
    case "www.datart.cz":
      return "datart";
    case "nakup.itesco.cz":
      return "itesco";
    case "www.rohlik.cz":
      return "rohlik";
    case "www.notino.cz":
      return "notino";
    case "www.tsbohemia.cz":
      return "tsbohemia";
    case "www.kosik.cz":
      return "kosik";
    case "www.mountfield.cz":
      return "mountfield";
  }
}

function getItemUrl(name, address) {
  const url = new URL(address);
  switch (name) {
    case "datart": {
      return url.pathname.replace("/","").replace(".html","");
    }
    case "kosik": {
      return address.replace("https://kosik.czhttps://www.kosik.cz/produkt/", "");
    }
    case "lekarna": {
      return url.pathname.replace(/\//g,"");
    }
    case "mall": {
      const match = url.pathname.match(/[^/]+$/);
      if (match && match[0]) {
        return match[0];
      }
      throw new Error(`couldnt get itemurl from mall (${url})`);
    }
    case "mironet": {
      return url.pathname.replace(/\//g,"");
    }
    case "notino": {
      const match = url.pathname.match(/\/[^/]+\/([^/]+(?:\/[^/]+)?)/);
      if (match && match[1]) {
        return match[1];
      }
      throw new Error(`couldnt get itemurl from notino (${url})`);
    }
  }

}

async function fetchItemId(name, url, dynamodb) {
  const itemUrl = getItemUrl(name, url);
  const res = await dynamodb.getItem({
        Key: {
            "itemUrl": {
                S: itemUrl
            },
        },
        TableName: "itemids",
    }).promise();
    if (!res) {
      throw new Error("itemid not found in dynamo");
    }
    return res.Item.itemId.S;
}

async function getItemId(name, params, _dynamodb) {
  if (params.itemId) {
    return params.itemId.toLowerCase();
  }

  const url = new URL(decodeURIComponent(params.url));
  switch (name) {
    case "alza":
      {
        const match = url.pathname.match(/d(\d+)\./);
        if (match && match[1]) {
          return match[1];
        }
        else if (url.searchParams.get("dq")) {
          return url.searchParams.get("dq");
        }
        break;
      }
    case "czc":
      {
        const match = url.pathname.match(/\/(\d+)a?\//);
        if (match && match[1]) {
          return match[1];
        }
        break;
      }
    case "itesco":
      {
        const match = url.pathname.match(/(\d+)$/);
        if (match && match[1]) {
          return match[1];
        }
      }
  }

  //const itemId = await fetchItemId(decodeURIComponent(params.url), dynamodb);
  throw new Error(`Cannot find itemID from ${params}`);
}

async function parseUrl(params, dynamodb) {
  const url = new URL(decodeURIComponent(params.url));

  const name = getName(url.hostname);
  const itemId = await getItemId(name, params, dynamodb);

  console.log({ name, itemId });
  const hash = crypto.createHash("md5");
  return hash.update(`${name}${itemId}`).digest("hex");
}

module.exports = {
  getName,
  getItemId,
  parseUrl,
};

