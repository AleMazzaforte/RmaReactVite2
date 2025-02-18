// Urls de cargar rma

let urlClientes = 'https://rmareactvite2.onrender.com/buscarCliente';
let urlProductos = 'https://rmareactvite2.onrender.com/listarProductos';
let urlMarcas = 'https://rmareactvite2.onrender.com/listarMarcas';
let urlAgregarRma = 'https://rmareactvite2.onrender.com/agregarRma';
let urlOp = 'https://rmareactvite2.onrender.com/listarOp';

if (window.location.hostname === 'localhost') {
  urlClientes = 'http://localhost:8080/buscarCliente';
  urlProductos = 'http://localhost:8080/listarProductos';
  urlMarcas = 'http://localhost:8080/listarMarcas';
  urlAgregarRma = 'http://localhost:8080/agregarRma';
  urlOp = 'http://localhost:8080/listarOp';
}

//++++++++++++++++++++++++++++++++++++++++
// Urls de numero de remito
let url = 'https://rmareactvite2.onrender.com/getUltimoNIngreso';
if (window.location.hostname === 'localhost') {
  url = 'http://localhost:8080/getUltimoNIngreso';
}

//++++++++++++++++++++++++++++++++++++++++

