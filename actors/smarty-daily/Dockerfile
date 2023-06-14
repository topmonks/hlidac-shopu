FROM apify/actor-node:18
COPY . ./
RUN npm --quiet set progress=false \
 && npm install --only=prod --no-optional \
 && echo "Installed NPM packages:" \
 && (npm list || true) \
 && echo "Node.js version:" \
 && node --version \
 && echo "NPM version:" \
 && npm --version
  