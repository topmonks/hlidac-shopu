import fs from "node:fs";
import path from "node:path";
import projectPath from "@hckr_/blendid/lib/projectPath.mjs";
import { texyTypography } from "@hckr_/blendid/lib/texy.mjs";
import gulp_mode from "gulp-mode";
import cssvariables from "postcss-css-variables";
import { ReviewsRegistry } from "./reviews.mjs";
import { ShopNumbersRegistry } from "./shop-numbers.mjs";
import { ShopsRegistry } from "./shops.mjs";
import { StatsRegistry } from "./stats.mjs";
import { WorkboxBuildRegistry } from "./workboxbuild.mjs";

/** @typedef {import("@types/nunjucks").Environment} Environment */

const longDateFormatter = new Intl.DateTimeFormat("cs", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

function assetPath(destPath, key) {
  const revManifest = path.join(destPath, "rev-manifest.json");
  if (fs.existsSync(revManifest)) {
    const manifest = JSON.parse(fs.readFileSync(revManifest).toString());
    return path.join(destPath, manifest[key]);
  }
  return path.join(destPath, key);
}

/**
 * @param {Record<string, *>} pathConfig
 * @param {{development: function(): boolean, production: function(): boolean}} mode
 * @param {Boolean} verbose
 */
export default function (pathConfig, mode, verbose) {
  return {
    images: true,
    fonts: true,
    static: true,

    cloudinary: {
      extensions: ["jpg", "jpeg", "png", "gif", "svg", "webp"]
    },

    stylesheets: {
      postcss: {
        plugins: [cssvariables({ preserve: true })]
      }
    },

    generate: {
      exclude: [
        "assets.json",
        "media.json",
        "images.json",
        "dashboard.json",
        "shops.json",
        "shopNumbers.json",
        "stats.json",
        "reviews.json"
      ],
      json: [
        {
          collection: "media",
          mergeOptions: {
            concatArrays: true,
            edit(json) {
              return { [json.published.split("-").shift()]: [json] };
            }
          }
        },
        {
          collection: "dashboard",
          mergeOptions: {
            concatArrays: true,
            edit(json) {
              return { [json.shop]: json };
            }
          }
        }
      ]
    },

    html: {
      data: {
        collections: ["media", "images", "assets", "build", "dashboard", "shops", "shopNumbers", "stats", "reviews"]
      },
      markedExtensions: [texyTypography("cs")],
      nunjucksRender: {
        filters: {
          longDate(str) {
            return longDateFormatter.format(new Date(str));
          },
          resolveUrl(str, base) {
            return URL.parse(str, base).href;
          }
        }
      },
      htmlmin: {
        minifyCSS: {
          compatibility: { properties: { urlQuotes: true } }
        }
      }
    },

    esbuild: {
      extensions: ["js", "mjs"],
      watch: "../../../lib/**/*.mjs",
      options: {
        logLevel: verbose ? "debug" : "error",
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
        metafileName: "../../../../www.hlidacshopu.cz/src/data/assets.json"
      }
    },

    production: {
      rev: { exclude: ["assets/img/*_logo.svg"] }
    },

    registries: [
      new WorkboxBuildRegistry(
        {
          swSrc: () => assetPath(projectPath(pathConfig.dest), "assets/esm/sw.js"),
          swDest: projectPath(pathConfig.dest, "assets/esm/sw.js"),
          globDirectory: pathConfig.dest,
          globPatterns: ["app/index.html", "assets/**/*.{js,css}"]
        },
        pathConfig,
        mode
      ),
      new ReviewsRegistry({}, pathConfig, mode),
      new ShopsRegistry({}, pathConfig, mode),
      new ShopNumbersRegistry({}, pathConfig, mode),
      new StatsRegistry({}, pathConfig, mode)
    ],

    additionalTasks: {
      development: {
        prebuild: ["prepare-reviews-data", "prepare-shops-data", "prepare-stats-data", "prepare-shop-numbers-data"],
        postbuild: ["workboxBuild"]
      },
      production: {
        prebuild: ["prepare-reviews-data", "prepare-shops-data", "prepare-stats-data", "prepare-shop-numbers-data"],
        postbuild: ["workboxBuild"]
      }
    },

    vite: {
      browser: "google chrome canary",
      browserArgs: "--ignore-certificate-errors --allow-insecure-localhost"
    }
  };
}
