const http = require("http");
const app = require("./src/app");
const socketHandler = require('./src/utils/socketHandler');

const server = http.createServer(app);
socketHandler(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
