import Apify from "apify";
import { Session } from "apify/build/session_pool/session.js";
import * as ce from "apify/build/crawlers/crawler_extension.js";
import { BrowserPool, PlaywrightPlugin } from "browser-pool";
import playwright from "playwright";

const CrawlerExtension = ce.default.default;

const {
  utils: {
    log,
    requestAsBrowser,
    puppeteer: { addInterceptRequestHandler }
  }
} = Apify;

/**
 * @typedef { import("./apify.json").SessionPool } SessionPool
 * @typedef { import("./types.js").CloudflareUnblockerOptions } CloudflareUnblockerOptions
 */

export default class CloudflareUnblocker extends CrawlerExtension {
  /**
   *
   * @param options {CloudflareUnblockerOptions} - Cloudflare unblocker options
   * @param options.apifyProxyGroups {Array} - Proxy groups from the Apify platform
   */
  constructor(options) {
    super();
    this.unblockUrl = options.unblockUrl;
    this.proxyConfiguration = options.proxyConfiguration;

    this.browserPool = new BrowserPool({
      retireBrowserAfterPageCount: 50,
      maxOpenPagesPerBrowser: 10,
      browserPlugins: [
        new PlaywrightPlugin(playwright.firefox, {
          launchOptions: { headless: false }
        })
      ]
    });

    this._shouldUseCustomTLS = false;
  }

  /**
   * Main function that unblocks your session.
   * @param options.session
   * @param options.request
   * @return {Promise<*|undefined>}
   */
  async unblock(options) {
    const { session, request } = options;

    if (this._isSessionBeingRenewed(session)) {
      request.retryCount = 0;
      this._throwError("Session is being renewed");
    }

    const oldShouldUseTLS = this._shouldUseCustomTLS;
    const requestOptions = this.getRequestOptions(session);
    const response = await requestAsBrowser({
      ...requestOptions,
      url: request.url
    });

    if (this._detectChallengeFunction(response)) {
      // Browser challenge detected starting the bypassing;
      try {
        this._markSessionBeingRenewed(session);
        return this._solveChallenge({
          response,
          session,
          request,
          requestOptions
        });
      } catch (e) {
        throw e;
      } finally {
        this._markSessionNotBeingRenewed(session);
      }
    } else if (response.statusCode === 403) {
      // Cloudflare captcha detected switching to slower TLS
      if (oldShouldUseTLS) {
        this.log.info("Captcha found even with the TLS hack");
        await Apify.setValue(
          `CAPTCHA-HTML-${Math.random() * 1000}`,
          response.body,
          { contentType: "text/html" }
        );
      } else {
        this.log.info(
          "Captcha found for the first time -> switching to custom TLS"
        );
        this._shouldUseCustomTLS = true;
      }
    }

    this.log.info("Session OK");
    session.setCookiesFromResponse(response);
    return response;
  }

  /**
   * Solves the challenge by starting the browser and saving the cookies to the session.
   * @param options
   * @param options.request
   * @param options.response
   * @param options.session
   * @param options.requestOptions
   * @return {Promise<*>}
   * @private
   */
  async _solveChallenge(options) {
    const { request, response, session } = options;
    const { body, headers } = response;

    const receivedCookies = headers["set-cookie"];
    log.debug(`${this.name}: received cookies: ${receivedCookies}`);
    const requestOptions = this.getRequestOptions(session);

    if (!receivedCookies) {
      await Apify.setValue(`NO-COOKIES-HTML-${Math.random() * 1000}`, body, {
        contentType: "text/html"
      });
    }

    session.setCookiesFromResponse(response);

    const cloudflareAuthReq = await this._getSolvedChallengeRequest({
      response,
      session,
      request
    });

    const browserHeaders = cloudflareAuthReq.headers();
    const finalRequestOpts = {
      ...requestOptions,
      url: cloudflareAuthReq.url(),
      payload: cloudflareAuthReq.postData(),
      headers: {
        ...requestOptions.headers,
        "Content-Type": browserHeaders["content-type"],
        Origin: browserHeaders.origin,
        Referer: browserHeaders.referer,
        Cookie: session.getCookieString(cloudflareAuthReq.url()),
        "Content-Length": cloudflareAuthReq.postData().length
      },
      method: "POST"
    };
    // Send the challenge response from requestAsBrowser
    const challengeResponse = await requestAsBrowser(finalRequestOpts);

    if (this._isChallengeSolvedFunction(challengeResponse)) {
      // Success
      request.retryCount = 0;
      session.setCookiesFromResponse(challengeResponse);
      this.log.info("Successfully unblocked");
      return challengeResponse;
    }

    // Something went wrong - challenge was not solved.
    session.retire();
    await Apify.setValue(
      `BLOCKED-HTML-${challengeResponse.statusCode}-${Math.random() * 1000}`,
      challengeResponse.body,
      { contentType: "text/html" }
    );
    this._throwError("Blocked");
  }

  /**
   * Locks session
   * @ODO: we could add this function to the Session natively
   * @param session {Session}
   * @private
   */
  _markSessionBeingRenewed(session) {
    session.userData.isBeingRenewed = true;
  }

  /**
   * Unlocks session
   * @param session {Session}
   * @private
   */
  _markSessionNotBeingRenewed(session) {
    session.userData.isBeingRenewed = false;
  }

  /**
   * Gets proxy URL
   * @param session {Session};
   * @return {String}
   * @private
   */
  _getProxyUrl(session) {
    return this.proxyConfiguration.newUrl(session.id);
  }

  /**
   *
   * @param session {Session}
   * @return {boolean}
   * @private
   */
  _isSessionBeingRenewed(session) {
    return session.userData.isBeingRenewed;
  }

  /**
   * Throws prefixed error
   * @param message {String} - Error message
   * @private
   */
  _throwError(message) {
    throw new Error(`${this.name}: ${message}`);
  }

  /**
   * Opens new page, where solves the challenge and returns the auth request details.
   * @param response
   * @param request - Puppeteer request object
   * @return {Promise<Object>} - Auth request
   * @private
   */
  async _getSolvedChallengeRequest({ response, request, session }) {
    const { headers, body } = response;
    const page = await this.puppeteerPool.newPage();
    let authRequest;

    // Add request interceptor to get the authRequest for unlocking our session and forward other network mesures.
    await addInterceptRequestHandler(page, async req => {
      const reqUrl = req.url();
      const method = req.method();

      if (request.url === reqUrl && method === "GET") {
        this.log.info(`Mocking initial navigation request: ${req.url()}`);
        await req.respond({ status: 200, body, headers });
      } else if (this._detectChallengeRequestFunction(req)) {
        authRequest = req;
        await req.abort();
      } else if (reqUrl.includes("transparent.gif")) {
        const imageResponse = await this._sendImageRequest(req, session);
        await req.respond({
          status: 200,
          body: imageResponse.body,
          headers: imageResponse.headers
        });
      } else {
        await req.abort();
      }
    });

    // Add debug to page log
    page.on("console", msg => this.log.debug(`${this.name}: ${msg.text()}`));

    // Navigate to the unblock url.
    await page.evaluate(url => {
      window.location.href = url;
    }, request.url);

    await this._waitUntilChallengeFinishedFunction();
    this.puppeteerPool.recyclePage(page).catch(() => {});
    return authRequest;
  }

  /**
   * Sends request with Cloudflare image like headers.
   * @param req {Request} - Puppeteer request
   * @param session {Session} - Session instance
   * @return {Promise<import("stream").Readable | import("http").IncomingMessage>}
   * @private
   */
  async _sendImageRequest(req, session) {
    const browserHeaders = req.headers();
    const requestOptions = this.getRequestOptions(session);

    const imageHeaders = {
      Referer: browserHeaders.referer,
      Connection: "keep-alive",
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36",
      "Sec-Fetch-User": "?1",
      Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Dest": "image",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
      Cookie: session.getCookieString(req.url())
    };

    return requestAsBrowser({
      ...requestOptions,
      url: req.url(),
      abortFunction: () => false,
      headers: imageHeaders
    });
  }

  /**
   * Gets the browser headers;
   * @param cookieString {String} - Cookie header string.
   * @return {Object} - Browser like headers.
   * @private
   */
  _getBrowserHeaders(cookieString) {
    return {
      Connection: "close",
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36",
      "Sec-Fetch-User": "?1",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Dest": "document",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
      Cookie: cookieString
    };
  }

  /**
   * Detects the Cloudflare challenge page by 503 status code and the CDATA tag;
   * @param response
   * @return {boolean}
   * @private
   */
  _detectChallengeFunction(response) {
    return response.statusCode === 503 && response.body.includes("CDATA");
  }

  /**
   * Detects Challenge request
   * @param request {Request} - Puppeteer request
   * @return {boolean} - true if challenge request detected
   * @private
   */
  _detectChallengeRequestFunction(request) {
    return request.method() === "POST";
  }

  /**
   * Waits until the challenge is computed.
   * @return {Promise<void>}
   * @private
   */
  async _waitUntilChallengeFinishedFunction() {
    await Apify.utils.sleep(5000);
  }

  /**
   * Checks if challenge is successfully solved.
   * @param challengeResponse
   * @return {boolean}
   * @private
   */
  _isChallengeSolvedFunction(challengeResponse) {
    return challengeResponse.statusCode === 200;
  }

  /**
   * Gets request options - these options are compatible with `Apify.utils.requestAsBrowser` and `@apify/http-request`
   * @param session {Session} - Session instance
   * @return {Object} - Contains request options
   */
  getRequestOptions(session) {
    const proxyUrl = this._getProxyUrl(session);

    const requestOptions = {
      headers: this._getBrowserHeaders(
        session.getCookieString(this.unblockUrl)
      ),
      proxyUrl
    };

    if (this._shouldUseCustomTLS) {
      requestOptions.ciphers = "AES256-SHA";
    }

    return requestOptions;
  }

  /**
   * Creates new Session instance for the SessionPool.
   * @param sessionPool {SessionPool}.
   * @return {Promise<Session>}
   */
  async createSessionFunction(sessionPool) {
    const session = new Session({ sessionPool });
    try {
      await this.unblock({ session, request: { url: this.unblockUrl } });
    } catch (e) {
      log.warning(`${this.name}: Could not unblock session`);
      log.exception(e);
    }
    return session;
  }

  // @TODO: DELETE
  attachToCheerioCrawler(cheerioCrawler) {
    const { useSessionPool } = cheerioCrawler;

    if (!useSessionPool) {
      throw new Error(
        'You must have the SessionPool enabled. You can enable SessionPool by setting "useSessionPool: true" to the crawler configuration'
      );
    }

    cheerioCrawler.prepareRequestFunction = async ({ request, session }) => {
      const newOptions = this.getRequestOptions(session);
      request.headers = newOptions.headers;
      if (newOptions.ciphers) {
        cheerioCrawler.requestOptions = { ciphers: newOptions.ciphers };
      }
    };
    cheerioCrawler.basicCrawler.sessionPoolOptions.createSessionFunction =
      this.createSessionFunction.bind(this);
    cheerioCrawler.persistCookiesPerSession = true;
    cheerioCrawler.useApifyProxy = true;
    cheerioCrawler.apifyProxyGroups = this.apifyProxyGroups;
  }

  /**
   * Gets options for the CheerionCrawler use interface.
   * @return {Object} - CheerioCrawler options
   */
  getCrawlerOptions() {
    const that = this;
    return {
      useSessionPool: true,
      sessionPoolOptions: {
        maxPoolSize: 100,
        createSessionFunction: this.createSessionFunction.bind(this)
      },
      persistCookiesPerSession: true,
      useApifyProxy: true,
      async prepareRequestFunction({ request, session }) {
        const newOptions = that.getRequestOptions(session);
        request.headers = newOptions.headers;
        if (newOptions.ciphers) {
          this.requestOptions = { ciphers: newOptions.ciphers };
        }
      }
    };
  }
}
