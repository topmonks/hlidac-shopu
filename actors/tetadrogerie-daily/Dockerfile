FROM apify/actor-node-playwright-chrome:24-1.64.1

COPY package.json ./

RUN npm --quiet set progress=false \
 && npm install --only=prod --no-optional

COPY . ./
