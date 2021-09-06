FROM apify/actor-node-puppeteer-chrome:16

COPY package.json ./

RUN npm --quiet set progress=false \
 && npm install aws-crt \
 && npm install --only=prod --no-optional

COPY . ./
