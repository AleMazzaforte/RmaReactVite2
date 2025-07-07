// Urls de cargar rma

let urlClientes = 'https://rma-back.vercel.app/buscarCliente';
let urlProductos = 'https://rma-back.vercel.app/listarProductos';
let urlMarcas = 'https://rma-back.vercel.app/listarMarcas';
let urlAgregarRma = 'https://rma-back.vercel.app/agregarRma';
let urlOp = 'https://rma-back.vercel.app/listarOp';
let urlActualizarCantidadPorBulto = 'https://rma-back.vercel.app/actualizarCantidadPorBulto';

if (window.location.hostname === 'localhost') {
  urlClientes = 'http://localhost:8080/buscarCliente';
  urlProductos = 'http://localhost:8080/listarProductos';
  urlMarcas = 'http://localhost:8080/listarMarcas';
  urlAgregarRma = 'http://localhost:8080/agregarRma';
  urlOp = 'http://localhost:8080/listarOp';
  urlActualizarCantidadPorBulto = 'http://localhost:8080/actualizarCantidadPorBulto';
}

//++++++++++++++++++++++++++++++++++++++++
// Urls de numero de remito
let url = 'https://rma-back.vercel.app/getUltimoNIngreso';
if (window.location.hostname === 'localhost') {
  url = 'http://localhost:8080/getUltimoNIngreso';
}

//++++++++++++++++++++++++++++++++++++++++

