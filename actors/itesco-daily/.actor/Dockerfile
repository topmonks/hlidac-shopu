FROM apify/actor-node-puppeteer-chrome:22

COPY package.json ./

RUN npm --quiet set progress=false \
 && npm install --omit=dev --omit=optional \
 && npx @puppeteer/browsers install chromium

COPY . ./
