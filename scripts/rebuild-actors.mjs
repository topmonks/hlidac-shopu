const token = process.argv[2];

const alreadyBuilt = new Set([
  // if you want to skip some actors build, add names here
]);

const resp = await fetch(
  `https://api.apify.com/v2/acts?token=${token}&my=true`
);
const { data } = await resp.json();
for (const { id, name } of data.items) {
  if (alreadyBuilt.has(name)) continue;
  const { data: version } = await fetch(
    `https://api.apify.com/v2/acts/${id}/versions?token=${token}`
  ).then(resp => resp.json());
  const ver = version.items.map(x => x.versionNumber)[version.total - 1];
  console.log("Rebuild", { name, ver });
  const resp = await fetch(
    `https://api.apify.com/v2/acts/${id}/builds?token=${token}&version=${ver}&useCache=true&tag=latest`,
    { method: "POST" }
  );
  if (!resp.ok) {
    console.error("Failed to rebuild", { name, ver, msg: await resp.json() });
  }
}

// node rebuild-actors.mjs "$(op read 'op://Hlidac shopu/Apify API Token/credential')"
