const request = require("request-promise");
const Apify = require("apify");

const { log, sleep } = Apify.utils;

class CaptchaSolver {
  /**
   * @param {string} token
   */
  constructor(token) {
    this.token = token;
    this.pendingSolutions = 0;
    this.stats = {
      started: 0,
      solved: 0,
      failed: 0,
      timeouted: 0
    };
  }

  async getSolution(siteKey, url, userAgent, timeoutSecs = 4 * 60) {
    const ncobj = {
      clientKey: this.token,
      task: {
        type: "NoCaptchaTaskProxyless",
        websiteURL: url,
        websiteKey: siteKey,
        userAgent
      }
    };

    log.debug("Started anticaptcha task");

    ++this.pendingSolutions;
    this.stats.started++;
    const response = await request({
      url: "https://api.anti-captcha.com/createTask",
      method: "POST",
      json: ncobj
    });

    if (response.errorId > 0) {
      throw new Error(
        `AntiCaptcha ${response.errorCode}: ${response.errorDescription}`
      );
    }

    log.debug("Waiting for solution");

    const solution = await Promise.race([
      this.timeout(timeoutSecs),
      this.waitForSolution(response.taskId)
    ]);

    if (!solution) return null;
    if (solution.timeout) {
      this.stats.timeouted++;
      throw new Error("Anticaptcha timed out");
    }

    log.debug(`Solution found, pending ${this.pendingSolutions}`, { solution });
    this.stats.solved++;

    return solution.solution.gRecaptchaResponse;
  }

  async timeout(seconds) {
    await sleep(seconds * 1000);
    return { timeout: true };
  }

  async waitForSolution(taskId) {
    let solution;
    do {
      await sleep(2500);
      try {
        solution = await this.getTaskResult(taskId);
        if (solution.errorId > 0) {
          throw new Error(
            `${solution.errorCode}: ${solution.errorDescription}`
          );
        }
      } catch (error) {
        this.stats.failed++;
        log.exception(e, "AntiCaptcha getSolution error");
        if (error.message.includes("ERROR_")) {
          --this.pendingSolutions;
          return null;
        }
      }
    } while (!solution || solution.status !== "ready");
    --this.pendingSolutions;
    return solution;
  }

  async getTaskResult(taskId) {
    return request({
      url: "https://api.anti-captcha.com/getTaskResult",
      method: "POST",
      json: {
        clientKey: this.token,
        taskId
      }
    });
  }

  getStats() {
    return this.stats;
  }
}

module.exports = CaptchaSolver;
