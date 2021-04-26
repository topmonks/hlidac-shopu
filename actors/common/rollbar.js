const Rollbar = require("rollbar");

module.exports = {
  init() {
    return new Rollbar({
      accessToken: "16376a37ab5c4ee790501771e9bb84f9",
      captureUncaught: true,
      captureUnhandledRejections: true
    });
  }
};
