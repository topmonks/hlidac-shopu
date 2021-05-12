const COOP_BOX_URL = "https://eshop.coop-box.cz/";
const LABELS = {
  START: "START",
  MARKET: "MARKET",
  MAIN_CATEGORY: "MAIN_CATEGORY",
  CATEGORY: "CATEGORY",
  LIST: "LIST",
  DETAIL: "DETAIL",
  COOP_BOX: "COOP_BOX",
  COOP_BOX_CATEGORY: "COOP_BOX_CATEGORY",
  COOP_BOX_CATEGORY_RESPONSE: "COOP_BOX_CATEGORY_RESPONSE",
  COOP_BOX_NEXT_PAGE: "COOP_BOX_NEXT_PAGE",
  COOP_BOX_NEXT_PAGE_RESPONSE: "COOP_BOX_NEXT_PAGE_RESPONSE"
};

const COOP_BOX_CATEGORY_POST = (source, formname = "PB") => {
  return {
    source,
    target: "form",
    action: "formreload",
    formname
  };
};

const MARKETS_URL =
  "https://e-coop.cz/wp-admin/admin-ajax.php?action=asl_load_stores&nonce=9538ffb9ee&load_all=1&layout=1";

module.exports = {
  LABELS,
  MARKETS_URL,
  COOP_BOX_URL,
  COOP_BOX_CATEGORY_POST
};
