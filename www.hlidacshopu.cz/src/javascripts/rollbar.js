import Rollbar from "rollbar/src/browser/core";
import instrumenter from "rollbar/src/browser/telemetry";
import telemeter from "rollbar/src/telemetry";

const getMeta = key => document.head.querySelector(`meta[name='${key}']`).getAttribute("content");

export function init() {
  Rollbar.setComponents({ telemeter, instrumenter });
  return Rollbar.init({
    accessToken: getMeta("rollbar:access-token"),
    captureUncaught: true,
    captureUnhandledRejections: true,
    payload: {
      environment: getMeta("hs:environment"),
      code_version: getMeta("hs:version")
    }
  });
}
