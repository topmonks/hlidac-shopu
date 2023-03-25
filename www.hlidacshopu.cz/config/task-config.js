/** @typedef {import("@typed/nunjucks").Environment} Environment */

const esbuild = require("gulp-esbuild");
const mode = require("gulp-mode")();
const cssvariables = require("postcss-css-variables");
const pathConfig = require("./path-config.json");
const projectPath = require("@topmonks/blendid/gulpfile.js/lib/projectPath.js");

const longDateFormatter = new Intl.DateTimeFormat("cs", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

const config = {
  images: true,
  fonts: true,
  static: true,
  javascripts: false,

  cloudinary: {
    extensions: ["jpg", "jpeg", "png", "gif", "svg", "webp"]
  },

  workboxBuild: {
    swSrc: projectPath(pathConfig.src, pathConfig.esbuild.src, "sw.js"),
    swDest: projectPath(pathConfig.dest, "sw.js"),
    globDirectory: pathConfig.dest,
    globPatterns: ["app/index.html", "assets/**/*.{js,css}"]
  },

  stylesheets: {
    postcss: {
      plugins: [cssvariables({ preserve: true })]
    }
  },

  svgSprite: {
    svgstore: {
      inlineSvg: true
    }
  },

  generate: {
    exclude: ["assets.json", "media.json", "images.json", "dashboard.json"],
    json: [
      {
        collection: "media",
        mergeOptions: {
          concatArrays: true,
          fileName: "media.json",
          edit: json => ({ [json.published.split("-").shift()]: [json] })
        }
      },
      {
        collection: "dashboard",
        mergeOptions: {
          concatArrays: true,
          fileName: "dashboard.json",
          edit: json => ({ [json.shop]: json })
        }
      }
    ]
  },

  html: {
    collections: ["media", "images", "assets", "build", "dashboard"],
    nunjucksRender: {
      /** @param {Environment} env */
      manageEnv(env) {
        env.addGlobal("currentYear", new Date().getFullYear());
      },
      filters: {
        longDate(str) {
          return longDateFormatter.format(new Date(str));
        }
      }
    },
    htmlmin: {
      minifyCSS: {
        compatibility: { properties: { urlQuotes: true } }
      }
    }
  },

  browserSync: {
    server: {
      baseDir: pathConfig.dest
    },
    browser: ["google chrome canary"]
  },

  esbuild: {
    extensions: ["js", "mjs"],
    watch: "../../../lib/**/*.mjs",
    options: {
      bundle: true,
      splitting: true,
      treeShaking: true,
      minify: mode.production(),
      sourcemap: true,
      format: "esm",
      platform: "browser",
      target: ["es2017", "firefox67", "safari12"],
      charset: "utf8",
      metafile: true,
      metafileName: `../../../../www.hlidacshopu.cz/src/data/assets.json`
    }
  },

  additionalTasks: {
    initialize(gulp, pathConfig, taskConfig) {
      const { src, task, dest } = gulp;
      const paths = {
        src: projectPath(pathConfig.src, pathConfig.esbuild.src, "*.js"),
        dest: projectPath(pathConfig.dest, pathConfig.esbuild.dest)
      };
      task("esbuild-prod", () =>
        src(paths.src)
          .pipe(esbuild(taskConfig.esbuild.options))
          .pipe(dest(paths.dest))
      );
      const gulpEsbuild = esbuild.createGulpEsbuild({ incremental: true });
      task("esbuild", () =>
        src(paths.src)
          .pipe(gulpEsbuild(taskConfig.esbuild.options))
          .pipe(dest(paths.dest))
      );
    },
    development: { code: ["esbuild"] },
    production: { code: ["esbuild-prod"] }
  },

  watch: { tasks: ["esbuild"] },

  production: {
    rev: true
  }
};

module.exports = config;
