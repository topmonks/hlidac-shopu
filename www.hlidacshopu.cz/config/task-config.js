const babel = require("gulp-babel");
const esbuild = require("gulp-esbuild");
const mode = require("gulp-mode")();
const pathConfig = require("./path-config.json");
const projectPath = require("@topmonks/blendid/gulpfile.js/lib/projectPath.js");

const config = {
  images: true,
  cloudinary: true,
  fonts: true,
  static: true,
  javascripts: false,

  workboxBuild: {
    swSrc: projectPath(pathConfig.src, pathConfig.esbuild.src, "sw.js"),
    swDest: projectPath(pathConfig.dest, "sw.js"),
    globDirectory: pathConfig.dest,
    globPatterns: ["app/index.html", "assets/**/*.{js,css}"]
  },

  stylesheets: {
    sass: {
      includePaths: ["./node_modules"]
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
    collections: ["media", "images", "assets", "build"],
    nunjucksRender: {
      filters: {
        longDate: str =>
          new Intl.DateTimeFormat("cs", {
            year: "numeric",
            month: "long",
            day: "numeric"
          }).format(new Date(str)),
        year: () => new Date().getFullYear()
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
    }
  },

  esbuild: {
    extensions: ["js", "mjs"],
    watch: "../../../lib/**/*.mjs",
    options: {
      bundle: true,
      splitting: true,
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

  "esbuild-legacy": {
    extensions: ["js", "mjs"],
    watch: "../../../lib/**/*.mjs",
    options: {
      bundle: true,
      splitting: false,
      minify: mode.production(),
      platform: "browser",
      target: ["es6"],
      charset: "utf8"
    }
  },

  additionalTasks: {
    initialize(gulp, pathConfig, taskConfig) {
      const { src, task, dest } = gulp;
      const paths = {
        src: projectPath(pathConfig.src, pathConfig.esbuild.src, "*.js"),
        dest: projectPath(pathConfig.dest, pathConfig.esbuild.dest)
      };
      const legacyPaths = {
        src: projectPath(
          pathConfig.src,
          pathConfig["esbuild-legacy"].src,
          "*.js"
        ),
        dest: projectPath(pathConfig.dest, pathConfig["esbuild-legacy"].dest)
      };
      task("esbuild-prod", () =>
        src(paths.src)
          .pipe(esbuild(taskConfig.esbuild.options))
          .pipe(dest(paths.dest))
      );
      task("esbuild-legacy", () =>
        src(legacyPaths.src)
          .pipe(esbuild(taskConfig["esbuild-legacy"].options))
          .pipe(
            babel({
              presets: [
                [
                  "@babel/preset-env",
                  {
                    useBuiltIns: "usage",
                    corejs: "3.12"
                  }
                ]
              ],
              browserslistEnv: "legacy",
              minified: true
            })
          )
          .pipe(dest(legacyPaths.dest))
      );
      const gulpEsbuild = esbuild.createGulpEsbuild({ incremental: true });
      task("esbuild", () =>
        src(paths.src)
          .pipe(gulpEsbuild(taskConfig.esbuild.options))
          .pipe(dest(paths.dest))
      );
    },
    development: { code: ["esbuild"] },
    production: { code: ["esbuild-prod", "esbuild-legacy"] }
  },

  watch: { tasks: ["esbuild"] },

  production: {
    rev: true
  }
};

module.exports = config;
