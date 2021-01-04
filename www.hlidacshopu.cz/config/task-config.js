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
      target: ["es2017", "firefox57", "safari12"],
      charset: "utf8",
      metafile: `../../../../www.hlidacshopu.cz/src/data/assets.json`,
      define: {
        "process.env.NODE_ENV": mode.production() ? "production" : "development"
      }
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
      const gulpEsbuild = esbuild.createGulpEsbuild();
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
