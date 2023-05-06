/** @typedef {import("@types/nunjucks").Environment} Environment */

import gulp_mode from "gulp-mode";
import cssvariables from "postcss-css-variables";
import projectPath from "@topmonks/blendid/gulpfile.js/lib/projectPath.mjs";
import pathConfig from "./path-config.json" assert { type: "json" };

const mode = gulp_mode();
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
      globals: {
        currentYear: new Date().getFullYear()
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

  watch: { tasks: ["esbuild"] },

  production: {
    rev: true
  }
};

export default config;
