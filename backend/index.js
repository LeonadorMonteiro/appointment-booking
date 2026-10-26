const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello! The appointment booking server is running');
});

app.listen(3000, () => {
  console.log('Servidor andando en http://localhost:3000');
});
