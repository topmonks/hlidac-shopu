import { Actor } from "apify";
import { main } from "./index.js";

await Actor.main(main, { statusMessage: "DONE" });
