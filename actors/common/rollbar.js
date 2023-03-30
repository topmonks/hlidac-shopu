import Rollbar from "rollbar";

export default {
  init() {
    return new Rollbar({
      accessToken:
        process.env.ROLLBAR_ACCESS_TOKEN ?? "16376a37ab5c4ee790501771e9bb84f9",
      captureUncaught: true,
      captureUnhandledRejections: true,
      verbose: true
    });
  }
};
