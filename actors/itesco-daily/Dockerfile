FROM apify/actor-node-puppeteer-chrome:20

COPY package.json ./

RUN npm --quiet set progress=false \
 && npm install --only=prod --no-optional

COPY . ./
