const URL = require("url").URL;
const search = require("./search");
const crypto = require('crypto');


function parseUrl(params) {
  const url = new URL(decodeURIComponent(params.url));
  switch(url.hostname) {
    case 'www.alza.cz': {
      if (params.itemId) {
        return ['alza', params.itemId];
      }

      const match = url.pathname.match(/d(\d+)\./);
      if (match && match[1]) {
        return ["alza", match[1]];
      } else if (url.searchParams.get('dq')) {
        return ["alza", url.searchParams.get('dq')];
      }
      throw new Error(`Cannot find itemID from ${params}`);
    }
    case 'www.mall.cz': {
      return ['mall', params.itemId];
    }
    case 'www.czc.cz': {
      if (!params.itemId) {
        return ['czc', params.itemId];
      }

      const match = url.pathname.match(/\/(\d+)a?\//);
      if (match && match[1]) {
        return ['czc', match[1]];
      }
      throw new Error(`Cannot find itemID from ${params}`);
    }
    case 'www.mironet.cz': {
      return ['mironet', params.itemId];
    }
    case 'www.datart.cz': {
      return ['datart', params.itemId];
    }
  }
}

exports.handler = async(event) => {
  console.log("get data for ", event);
  const [index, itemId] = parseUrl(event.queryStringParameters);
  const resp = await search(index, itemId);

  console.log(resp);
  const ary = resp.hits.hits.map(row => row['_source']);

  const response = {
    statusCode: 200,
    body: JSON.stringify(ary),
  };
  return response;
};
