const markdownToJSON = require("gulp-markdown-to-json");
const marked = require("marked");
const merge = require("gulp-merge-json");
const path = require("path");
const alias = require("@rollup/plugin-alias");
const resolve = require("rollup-plugin-pnp-resolve");
const pathConfig = require("./path-config.json");
const projectPath = require("@topmonks/blendid/gulpfile.js/lib/projectPath");
const createSharedTaskConfig = require("../../shared/config/createSharedTaskConfig");

const config = createSharedTaskConfig(__dirname, {
  locales: ["cs", "cs-CZ"],
  images: true,
  cloudinary: true,
  fonts: true,
  static: true,
  stylesheets: true,
  workboxBuild: false,

  javascripts: {
    replacePlugins: true,
    plugins: [
      alias({
        entries: [{ find: "tslib", replacement: "tslib/tslib.es6.js" }]
      }),
      resolve({ browser: true })
    ],
    modules: {
      app: "app.js",
      index: "index.js",
      dashboard: "dashboard.js",
      topslevy: "topslevy.js",
      reviews: "reviews.js",
      extension: "extension.js",
      android: "android.js",
      chrome: "chrome.js",
      firefox: "firefox.js",
      safari: "safari.js"
    },
    external: [
      "https://cdn.jsdelivr.net/npm/chart.js@2.9.3/dist/Chart.bundle.min.js"
    ],
    terser: {
      warnings: "verbose"
    }
  },

  svgSprite: {
    svgstore: {
      inlineSvg: true
    }
  },

  html: {
    collections: ["media", "images"],
    nunjucksRender: {
      filters: {
        longDate: str =>
          new Intl.DateTimeFormat("cs", {
            year: "numeric",
            month: "long",
            day: "numeric"
          }).format(new Date(str))
      }
    }
  },

  browserSync: {
    server: {
      baseDir: pathConfig.dest
    }
  },

  additionalTasks: {
    initialize({ task, src, dest, series, watch }, PATH_CONFIG, TASK_CONFIG) {
      const dataPath = projectPath(PATH_CONFIG.src, PATH_CONFIG.data.src);
      const mediaSrc = projectPath(dataPath, "media/**/*.md");
      const generateMediaJson = () =>
        src(mediaSrc)
          .pipe(markdownToJSON(marked))
          .pipe(
            merge({
              concatArrays: true,
              fileName: "media.json",
              edit: json => ({ [json.published.split("-").shift()]: [json] })
            })
          )
          .pipe(dest(dataPath));

      task("media-data", generateMediaJson);
      task("media:watch", cb => {
        watch(mediaSrc, generateMediaJson);
        watch("media.json", { cwd: dataPath }, series("html"));
        cb();
      });
    },
    development: {
      prebuild: ["media-data"],
      postbuild: ["media:watch"]
    },
    production: {
      prebuild: ["media-data"]
    }
  },

  production: {
    rev: true
  }
});

module.exports = config;
