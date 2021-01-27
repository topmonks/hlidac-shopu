FROM apify/actor-node

RUN npm install --global yarn

COPY package.json ./

RUN yarn install --production \
 && echo "Installed NPM packages:" \
 && yarn list \
 && echo "Node.js version:" \
 && node --version \
 && echo "Yarn version:" \
 && yarn --version

COPY . ./

CMD yarn start
