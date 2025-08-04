// src/utilidades/Urls.ts

const isLocalhost = window.location.hostname === "localhost";
const base = isLocalhost ? "http://localhost:8080" : "https://rma-back.vercel.app";
                                                   //https://rma-back.vercel.app/actualizarProductoInventario
const Urls = {
  clientes: {
    cargar: `${base}/cargarCliente`,
    listar: `${base}/listarCliente`,
    actualizar: `${base}/actualizarCliente`,
    buscar: `${base}/buscarCliente`,
  },
  transportes: {
    actualizar: `${base}/actualizarTransporte`,
    eliminar: `${base}/eliminarTransporte`,
    buscar: `${base}/buscarTransporte`,
    cargar: `${base}/cargarTransporte`,
  },
  productos: {
    cargar: `${base}/cargarProducto`,
    listar: `${base}/listarproductos`,/////////////////////////////////////////
    listarMarcas: `${base}/listarMarcas`,
    actualizarCantidadPorBulto: `${base}/actualizarCantidadPorBulto`,
    getSku: `${base}/getSku`,
    eliminarDeOp: `${base}/eliminarProductoOp`,
    actualizar: `${base}/actualizarProducto`,
    eliminar: `${base}/eliminarProducto`,
  },
  rma: {
    agregar: `${base}/agregarRma`,
    listarOp: `${base}/listarOp`,
    actualizarOp: `${base}/actualizarOp`,
    listarOpProductos: `${base}/listarOpProductos`,
    buscar: `${base}/buscarRMA`,
    eliminar: `${base}/eliminarRma`,
    actualizarProducto: `${base}/actualizarProductoRma`,
    getPorCliente: `${base}/getRmaCliente`,
  },
  remito: {
    getUltimoNumero: `${base}/getUltimoNIngreso`,
  },
  marcas: {
    cargar: `${base}/cargarMarca`,
    actualizar: `${base}/actualizarMarca`,
    eliminar: `${base}/eliminarMarca`,
    listar: `${base}/listarMarcas`,
  },
  operaciones: {
    guardar: `${base}/guardarOp`,
    guardarProductos: `${base}/guardarOpProductos`,
  },
  inventario: {
  preparar: `${base}/prepararInventario`,
  guardar: `${base}/guardarInventario`,
  actualizar: `${base}/actualizarBloques`,
  actualizarProducto: `${base}/actualizarProductoInventario`
  },
  devolucion: {
    agregar: `${base}/agregarDevolucion`,
  },
  estadisticas: {
    estadisticas: `${base}/api/Estadisticas/rma`
  },
  reposicion: {
    guardar: `${base}/guardarReposicion`,
    obtener: `${base}/obtenerReposiciones`,
  }

};

export default Urls;
