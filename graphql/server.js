const app = require("./app");

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`GraphQL server running on port ${port}`));
}
