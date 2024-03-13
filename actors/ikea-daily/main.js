import { Actor } from "apify";
import { main } from "./search.js";

await Actor.main(main, { statusMessage: "DONE" });
