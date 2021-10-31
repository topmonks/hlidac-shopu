const Apify = require("apify");

async function retry(callback) {
  let lastError;
  for (let i = 1; i <= 4; i++) {
    try {
      const result = await callback();
      return result;
    } catch (e) {
      lastError = e;
      await Apify.utils.sleep(i * 600);
    }
  }

  throw lastError;
}

module.exports = { retry };
