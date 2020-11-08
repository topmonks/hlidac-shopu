const alias = require("@rollup/plugin-alias");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const replace = require("@rollup/plugin-replace");
const path = require("path");
const pathConfig = require("./path-config.json");

const config = {
  images: true,
  cloudinary: true,
  fonts: true,
  static: true,

  workboxBuild: {
    swSrc: path.join(pathConfig.src, pathConfig.javascripts.src, "sw.js"),
    swDest: path.join(pathConfig.dest, "sw.js"),
    globDirectory: pathConfig.dest,
    globPatterns: ["app/index.html", "assets/**/*.{js,css}"]
  },

  stylesheets: {
    sass: {
      includePaths: ["./node_modules"]
    }
  },

  javascripts: {
    replacePlugins: true,
    plugins: [
      alias({
        entries: [{ find: "tslib", replacement: "tslib/tslib.es6.js" }]
      }),
      nodeResolve({ browser: true }),
      replace({
        "process.env.NODE_ENV": JSON.stringify(
          process.env.NODE_ENV || "production"
        )
      })
    ],
    modules: {
      app: "app.js",
      index: "index.js",
      dashboard: "dashboard.js",
      topslevy: "topslevy.js",
      reviews: "reviews.js",
      android: "android.js",
      chrome: "chrome.js",
      firefox: "firefox.js",
      safari: "safari.js"
    },
    terser: {
      warnings: "verbose"
    }
  },

  svgSprite: {
    svgstore: {
      inlineSvg: true
    }
  },

  generate: {
    exclude: ["assets.json", "media.json", "images.json"],
    json: [
      {
        collection: "media",
        mergeOptions: {
          concatArrays: true,
          fileName: "media.json",
          edit: json => ({ [json.published.split("-").shift()]: [json] })
        }
      }
    ]
  },

  html: {
    collections: ["media", "images", "assets"],
    nunjucksRender: {
      filters: {
        longDate: str =>
          new Intl.DateTimeFormat("cs", {
            year: "numeric",
            month: "long",
            day: "numeric"
          }).format(new Date(str))
      }
    },
    htmlmin: {
      minifyJS: false,
      minifyCSS: {
        compatibility: { properties: { urlQuotes: true } }
      }
    }
  },

  browserSync: {
    server: {
      baseDir: pathConfig.dest
    }
  },

  production: {
    rev: true
  }
};

module.exports = config;
