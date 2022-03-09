import Apify from "apify";

const { log } = Apify.utils;

const { ANTI_CAPTCHA_TOKEN, APIFY_PROXY_PASSWORD } = process.env;

const SELECTORS = {
  captchaFrame: 'iframe[src^="https://www.google.com/recaptcha"]',
  captchaResponse: "#g-recaptcha-response"
};

export class CaptchaSolver {
  /**
   * @param {Stats=} stats
   */
  constructor(stats = {}) {
    this.token = ANTI_CAPTCHA_TOKEN;
    this.solved = 0;
    this.stats = stats;
  }

  async getSolution(page, userAgent, getSiteKey, captchaSelector) {
    await page
      .waitForSelector(captchaSelector || SELECTORS.captchaFrame)
      .catch(error => {
        log.error("No captcha selector found");
        return null;
      });

    // TODO find out if the selector is universal
    const getSiteKeyDefault = () => {
      const match = document.querySelector("#login-recaptcha");
      return match ? match.getAttribute("data-sitekey") : null;
    };

    const siteKey = await page.evaluate(getSiteKey || getSiteKeyDefault);

    if (!siteKey) throw new Error("Cannot find site key");

    const requestOptions = {
      clientKey: this.token,
      task: {
        type: "NoCaptchaTaskProxyless",
        websiteURL: await page.url(),
        websiteKey: siteKey,
        userAgent
      }
    };

    log.debug("Started anticaptcha task");

    const response = await Apify.utils.requestAsBrowser({
      url: "https://api.anti-captcha.com/createTask",
      method: "POST",
      proxyUrl: `http://groups-SHADER:${APIFY_PROXY_PASSWORD}@proxy.apify.com:8000`,
      payload: JSON.stringify(requestOptions),
      json: true
    });

    this.stats.tasks++;

    if (response.body.errorId > 0) {
      this.stats.failed++;
      throw new Error(
        `AntiCaptcha ${response.body.errorCode}: ${response.body.errorDescription}`
      );
    }

    const getSolution = () =>
      Apify.utils.requestAsBrowser({
        url: "https://api.anti-captcha.com/getTaskResult",
        method: "POST",
        proxyUrl: `http://groups-SHADER:${APIFY_PROXY_PASSWORD}@proxy.apify.com:8000`,
        payload: JSON.stringify({
          clientKey: this.token,
          taskId: response.body.taskId
        }),
        json: true
      });

    log.debug("Waiting for solution");

    let solutionResponse;
    do {
      await new Promise(resolve => setTimeout(resolve, 5000));
      try {
        const response = await getSolution();
        solutionResponse = response.body;
        if (solutionResponse.errorId > 0)
          throw new Error(
            `${solutionResponse.errorCode}: ${solutionResponse.errorDescription}`
          );
      } catch (error) {
        if (error.message.includes("ERROR_")) {
          log.error(`AntiCaptcha getSolution error: ${error.message}`);
          this.stats.failed++;
          return null;
        }
      }
    } while (!solutionResponse || solutionResponse.status !== "ready");

    this.stats.solved++;
    log.debug("Solution found", { solution: solutionResponse });
    this.solved++;
    const solution = solutionResponse.solution.gRecaptchaResponse;

    //await this.injectSolution(page, solution);

    return solution;
  }

  /*injectSolution = async (page, solution) => page.evaluate(({ solution, SELECTORS }) => {
      const $captchaResponse = document.querySelector(SELECTORS.captchaResponse);
      if ($captchaResponse)
          $captchaResponse.innerHTML = solution;

      if (window.grecaptcha.enterprise)
          window.grecaptcha.enterprise.getResponse = () => solution;
      else
          window.grecaptcha.getResponse = () => solution;
  }, { solution, SELECTORS });*/

  getSolvedCount() {
    return this.solved;
  }
}
