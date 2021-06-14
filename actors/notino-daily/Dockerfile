FROM apify/actor-node:16

COPY package.json ./


# Install default dependencies, print versions of everything
RUN npm --quiet set progress=false \
 && npm install --only=prod --no-optional

COPY . ./
