const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('¡Hola! El servidor de turnos funciona');
});

app.listen(3000, () => {
  console.log('Servidor andando en http://localhost:3000');
});
