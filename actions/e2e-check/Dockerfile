FROM node:slim
COPY . .
RUN npm install
RUN ls
RUN ls /actions
ENTRYPOINT ["node", "/actions/e2e-check/main.js"]