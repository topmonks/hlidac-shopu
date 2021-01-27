const request = require("request-promise");
const cheerio = require("cheerio");
const errors = require("request-promise/errors");

async function postAnticaptcha(url, session, token, proxyConfiguration) {
  const proxyUrl = proxyConfiguration.newUrl(session.id);

  const headers = {
    "User-Agent": session.userAgent,
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8,cs;q=0.7",
    "Accept":
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
    "Referer": url,
    "Cache-Control": "max-age=0",
    "Upgrade-Insecure-Requests": "1"
  };

  const body = {
    "g-recaptcha-response": token,
    "recaptcha_response": ""
  };

  try {
    await request({
      method: "POST",
      uri: url,
      headers,
      jar: session.jar,
      proxy: proxyUrl,
      form: body
    });
  } catch (e) {
    if (e instanceof errors.StatusCodeError) {
      if (e.statusCode === 302) {
        return "Ok";
      }
    }
    throw e;
  }
}

async function getCheerioResponse(url, session, proxyConfiguration) {
  const proxyUrl = proxyConfiguration.newUrl(session.id);

  const headers = {
    "User-Agent": session.userAgent,
    "Accept":
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
    "Cache-Control": "max-age=0",
    "Upgrade-Insecure-Requests": "1"
  };

  const response = await request({
    uri: url,
    headers,
    proxy: proxyUrl,
    jar: session.jar
  });

  return cheerio.load(response);
}

module.exports = { postAnticaptcha, getCheerioResponse };
