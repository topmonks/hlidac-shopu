exports.buildUrl = (domain, link) => {
  if (link === null) {
    return null;
  }

  if (link.startsWith("http")) {
    return link;
  }

  if (link.startsWith("/")) {
    return `${domain}${link}`;
  }

  return `${domain}/${link}`;
};
