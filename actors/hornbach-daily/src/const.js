const LABELS = {
  SITE: "SITE",
  CATEGORY: "CATEGORY"
};

const API_URL = (categoryId, page = 1) =>
  `https://www.hornbach.cz/mvc/article/load/article-list/cs/661/${categoryId}/36/${page}/-`;

const PRICE_HEADER = {
  authority: "www.hornbach.cz",
  "sec-ch-ua":
    '" Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',
  accept: "application/json, text/plain, */*",
  undefined: undefined,
  "x-requested-with": "XMLHttpRequest",
  "sec-ch-ua-mobile": "?0",
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.164 Safari/537.36",
  "content-type": "application/json;charset=UTF-8",
  origin: "https://www.hornbach.cz",
  "sec-fetch-site": "same-origin",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  referer:
    "https://www.hornbach.cz/shop/Bazeny/Bazenove-prislusenstvi/S12193/seznam-zbozi.html",
  "accept-language": "cs,en-US;q=0.9,en;q=0.8,sk;q=0.7",
  cookie:
    "hbMarketCookie=661; dtCookie=v_4_srv_1_sn_43A3ADA511729BC9922A6B98FA93903C_perc_100000_ol_0_mul_1_app-3A7fb11a5a93407b7e_0; rxVisitor=1626684479004DQMCOU6PC9AC79T7DEGDI7TMH2J86GUL; s=t; iridion_profile_session=0; iridion_session=1626684479085096; iridion_user=%5B%7B%22u%22%3A%221626684479085096%22%2C%22v%22%3A%221.3.3%22%7D%5D; cookiesEnabled=1626684479102; _gcl_au=1.1.1110859386.1626684480; CookieConfirmation=confirmed; choosenLanguage=cs_CZ; HBSitePreference=NORMAL; wt_ttv2_e_789963115593991=Vrta%C4%8Dky%2C%20kladiva%20a%20aku%20%C5%A1roubov%C3%A1ky***Sortiment%7CVrta%C4%8Dky%2C%20kladiva%20a%20aku%20%C5%A1roubov%C3%A1ky*clearfix******1*2*10%25; wt_ttv2_c_789963115593991=Barvy***Sortiment%7CBarvy*clearfix******1*2*10%25~Vrta%C4%8Dky%2C%20kladiva%20a%20aku%20%C5%A1roubov%C3%A1ky***Sortiment%7CVrta%C4%8Dky%2C%20kladiva%20a%20aku%20%C5%A1roubov%C3%A1ky*clearfix******1*2*10%25; hbMarketSession=661; cz_hornbach=ffffffffaf1dbe3c45525d5f4f58455e445a4a42290f; _gcl_aw=GCL.1626878013.CjwKCAjwi9-HBhACEiwAPzUhHFUrTVNx6ON6IRrbS_zU7POdG_r_J-oP56_CB30s-NQeDgA4dFzC7RoCxi4QAvD_BwE; JSESSIONID=F28274CBC6E25A2AD1D25F949FCC701A.ajp13_live_CZ_4; wt_ttv2_s_789963115593991=9897; wt_ttv2_s_789963115593991=9897; dtSa=-; wt_rla=789963115593991%2C53%2C1626877858925; dtLatC=3; rxvt=1626880432083|1626877857856; dtPC=1$278631722_797h1vAARDBQWMWIOLSCSCUPPHKPSTUUFKAFAM-0e10"
};
module.exports = {
  LABELS,
  PRICE_HEADER,
  API_URL
};
