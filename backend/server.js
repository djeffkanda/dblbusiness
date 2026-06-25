require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3200;

app.listen(PORT, () => {
  console.log(`bldbusiness application tier listening on port ${PORT}`);
});
