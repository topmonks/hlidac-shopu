import Apify from "apify";

// at this point, the main page is already loaded in $
export async function handleStart({ $ }) {
  const requestQueue = await Apify.openRequestQueue();
  // start page, add all categories links to requestQueue
  const links = $("ul.main-menu-nav li.has-sub-nav > a");
  const menu = [];
  for (link in links) {
    const category = links[link].attribs;
    if (category && category.href && category.href != "/akce/") {
      await requestQueue.addRequest({
        url: `https://www.kasa.cz${category.href}`,
        userData: { label: "LIST" }
      });

      menu.push(category.href);
      console.log(
        `Saving 'https://www.kasa.cz'${category.href} to request queue.`
      );
    }
  }
  console.log(`Saved all links (${menu.length}) to request queue.`);
}

// v {} si posilam informace, ktere chci mit, tedy tady navic state, ve kterem je pocet produktu, a request, ze ktereho taham url a mohu tahat i label
export async function handleList({ $, state, request }) {
  // const requestQueue = await Apify.openRequestQueue();
  const cat = $("ul.sidebar-menu-tree li:not(.is-extra)");
  const list = [];
  for (c of cat.get()) {
    if ($(c).text() && !$(c).text().match("Bazar")) {
      list.push($(c).text().trim());
      const categ = request.url;
      const subcateg = $(c).text().trim();
      const items = Number(subcateg.match(/\((\d+)\)/)[1]);
      const result = {
        categ,
        subcateg,
        items
      };
      // console.log(result);
      await Apify.pushData(result);
    }
  }

  // how do I save this not to delete it in every run? dám sum někam jinam, na zacatek? A jak ho pak nasdilim sem?
  let sum = 0;
  for (l in list) {
    sum += Number(list[l].match(/\((\d+)\)/)[1]);
    // console.log(`Adding ${list[l].replace(/\D/g, '')} items from category ${list[l]}`)
  }
  // kdyz to mam cele vypocitane, pridam to k tomu, co uz mam spocitane z jinych stranek
  state.productCount += sum;
  console.log(
    `Products on this page: ${sum}, ${request.url}, products altogether so far ${state.productCount}`
  );
}
