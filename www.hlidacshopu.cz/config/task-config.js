const esbuild = require("gulp-esbuild");
const pathConfig = require("./path-config.json");
const projectPath = require("@topmonks/blendid/gulpfile.js/lib/projectPath.js")

const config = {
  images: true,
  cloudinary: true,
  fonts: true,
  static: true,

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

  javascripts: false,

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

  esbuild: {
    extensions: ["js"],
    options: {
      bundle: true,
      splitting: true,
      minify: true,
      format: "esm",
      target: "es2019",
      platform: "browser",
      define: {
        "process.env.NODE_ENV": "production"
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
      console.log(paths);
      task("esbuild", () =>
        src(paths.src)
          .pipe(esbuild(taskConfig.esbuild.options))
          .pipe(dest(paths.dest))
      );
    },
    development: { code: ["esbuild"] },
    production: { code: ["esbuild"] }
  },

  watch: { tasks: ["esbuild"] },

  production: {
    rev: true
  }
};

module.exports = config;
