import randomMua from "random-mua";
import { v4 as uuidv4 } from "uuid";

export default function getHeaders() {
  return {
    "x-requested-with": "XMLHttpRequest",
    accept: "*/*",
    "User-Agent": randomMua("m"),
    "x-platform-type": "mobile-html5",
    "x-client": "MWEB",
    "x-device-id": uuidv4(),
    authority: "m.olx.pl"
  };
}
