import Rollbar from "rollbar";

export default {
  init() {
    return new Rollbar({
      accessToken:
        process.env.ROLLBAR_ACCESS_TOKEN ?? "ab0fdb5fcb0640d68851e631daedf459",
      captureUncaught: true,
      captureUnhandledRejections: true,
      verbose: true
    });
  }
};
