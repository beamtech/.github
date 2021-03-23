FROM node:slim
COPY . .
RUN npm install
ENTRYPOINT ["node", "/actions/e2e-check/main.js"]