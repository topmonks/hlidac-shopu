const siteMapToLinks = data => {
  const locs = data.replace(/\s+/g, "").match(/(<loc>)(.*?)(<\/loc>)/g);
  if (locs) {
    return locs.map(link => link.replace(/<loc>|<\/loc>/g, ""));
  }
  return [];
};

const getCategoryId = url => {
  const match = url.match(/\/([A-Z]+\d+)\/seznam/);
  const [all, id] = match;
  return id;
};

const getIdFromUrl = url => {
  const match = url.match(/\/(\d+)\/artikl.html$/);
  if (match && match.length > 2) {
    const [full, id] = match;
    return id;
  }
  return null;
};

module.exports = {
  siteMapToLinks,
  getIdFromUrl,
  getCategoryId
};
