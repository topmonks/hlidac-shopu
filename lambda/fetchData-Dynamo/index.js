const URL = require("url").URL;
const search = require("./search");
const cleanData = require("./cleanData");

function parseUrl(params) {
  const url = new URL(decodeURIComponent(params.url));
  switch(url.hostname) {
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
  }
}

exports.handler = async (event) => {
  console.log("get data for ", event);
  const [index, itemId] = parseUrl(event.queryStringParameters);
  const resp = await search(index, itemId);

  const r = resp.Items[0].value.S;

  const cleanAry = cleanData(JSON.parse(r));

  // TODO implement
  const response = {
    statusCode: 200,
    body: JSON.stringify(cleanAry),
  };
  return response;
};
