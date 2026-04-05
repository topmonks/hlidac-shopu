FROM apify/actor-node-puppeteer-chrome:24

COPY package.json ./

RUN npm --quiet set progress=false \
 && npm install --omit=dev --omit=optional --fund=false --audit=false --save=false

# Pre-download the cloakbrowser stealth-Chromium binary (~200 MB) during the
# image build so the first actor run doesn't pay the download cost. The
# library caches the binary under $HOME/.cache/cloakbrowser by default.
RUN node -e "import('cloakbrowser').then(async ({ launch }) => { const b = await launch({ headless: true }); await b.close(); }).catch(e => { console.error(e); process.exit(1); })"

COPY . ./
