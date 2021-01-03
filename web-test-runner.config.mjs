import { defaultReporter } from "@web/test-runner";
import { junitReporter } from "@web/test-runner-junit-reporter";

export default {
  nodeResolve: true,
  reporters: [defaultReporter(), junitReporter()]
};
