export const siteMapToLinks = data => {
  const locs = data.replace(/\s+/g, "").match(/(<loc>)(.*?)(<\/loc>)/g);
  if (locs) {
    return locs.map(link => link.replace(/<loc>|<\/loc>/g, ""));
  }
  return [];
};

export const getCategoryId = url => {
  const match = url.match(/\/([A-Z]+\d+)\/[se|zo]+znam/);
  const [all, id] = match;
  return id;
};

export const getIdFromUrl = url => {
  const match = url.match(/\/(\d+)\/artikl.html$/);
  if (match && match.length > 2) {
    const [full, id] = match;
    return id;
  }
  return null;
};

export const getCategories = categoryPath => {
  const arr = categoryPath.split("/");
  const category = [];
  for (const a of arr) {
    const c = a.split(":");
    if (c.length === 2) {
      category.push(c[0]);
    }
  }
  return category.join(" > ");
};
