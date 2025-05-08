FROM apify/actor-node-puppeteer-chrome:24

COPY package.json ./

RUN npm --quiet set progress=false \
 && npm install --omit=dev --omit=optional

COPY . ./
