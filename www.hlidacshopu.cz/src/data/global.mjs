function countInteractions(type) {
  return stats =>
    stats
      .filter(x => x.interactionType === `https:/schema.org/${type}`)
      .reduce((acc, x) => acc + x.userInteractionCount, 0);
}

const countReviews = countInteractions("ReviewAction");
const countInstalls = countInteractions("InstallAction");

function countProducts(items) {
  return items
    .filter(x => x.count_all)
    .map(x => Number(x.count_all))
    .reduce((acc, x) => acc + x, 0);
}

export default {
  meta: {
    lang: "cs",
    url: "https://www.hlidacshopu.cz/",
    title: "Hlídač shopů",
    description: "Ujistěte se, že nakupujete opravdu se slevou",
    generator: "@hckr_/blendid - static site generator and assets pipeline"
  },
  blackFriday: {
    currentYear: 2026
  },
  get currentYear() {
    return new Date().getFullYear();
  },
  filter: {
    shopsToShowOnHP(arr) {
      return arr.filter(item => item.show);
    }
  },
  countInstalls,
  countReviews,
  countProducts
};
