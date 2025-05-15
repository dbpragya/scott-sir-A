
const app = require("./src/app");

const PORT = process.env.PORT || 5000;

app.use('/', (req, res) => {
  res.send("Welcome to the server");
});


app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
  console.log(`Server running on: http://localhost:${PORT}`);

});
