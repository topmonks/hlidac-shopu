const randomMua = require("random-mua");
const uuidv4 = require("uuid/v4");

function getHeaders() {
  return {
    "x-requested-with": "XMLHttpRequest",
    accept: "*/*",
    "User-Agent": randomMua("m"),
    "x-platform-type": "mobile-html5",
    "x-client": "MWEB",
    "x-device-id": uuidv4(),
    authority: "m.olx.pl"
  };
}

module.exports = getHeaders;
