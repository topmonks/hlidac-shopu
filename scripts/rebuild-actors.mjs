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
  const { data: versions } = await fetch(
    `https://api.apify.com/v2/acts/${id}/versions?token=${token}`
  ).then(resp => resp.json());
  const version = versions.items.map(x => x.versionNumber)[versions.total - 1];
  console.log("Rebuild", { name, version });
  const params = new URLSearchParams({
    token,
    version,
    tag: "latest",
    useCache: true,
    waitForFinish: 80
  });
  const resp = await fetch(
    `https://api.apify.com/v2/acts/${id}/builds?${params}`,
    { method: "POST" }
  );
  if (!resp.ok) {
    console.error("Failed to rebuild", { name, version, msg: await resp.json() });
  }
}

// node rebuild-actors.mjs "$(op read 'op://Hlidac shopu/Apify API Token/credential')"
