// src/utilidades/Urls.ts

import { ProductosConDescuento } from "../ProductosConDescuento";

const isLocalhost = window.location.hostname === "localhost";
const base = isLocalhost ? "http://localhost:8080" : "https://rma-back.vercel.app";

const Urls = {
  usuarios: {
    cargar: `${base}/cargarUsuario`
  },
  clientes: {
    cargar: `${base}/cargarCliente`,
    listar: `${base}/listarCliente`,
    actualizar: `${base}/actualizarCliente`,
    buscar: `${base}/buscarCliente`,
    eliminar: `${base}/eliminarCliente`,
  },
  transportes: {
    actualizar: `${base}/actualizarTransporte`,
    eliminar: `${base}/eliminarTransporte`,
    buscar: `${base}/buscarTransporte`,
    cargar: `${base}/cargarTransporte`,
  },
  productos: {
    cargar: `${base}/cargarProducto`,
    listar: `${base}/listarproductos`,
    listarMarcas: `${base}/listarMarcas`,
    actualizarCantidadPorBulto: `${base}/actualizarCantidadPorBulto`,
    getSku: `${base}/getSku`,
    eliminarDeOp: `${base}/eliminarProductoOp`,
    actualizar: `${base}/actualizarProducto`,
    eliminar: `${base}/eliminarProducto`,
    inactivar: `${base}/inactivarProducto`
  },
  rma: {
    agregar: `${base}/agregarRma`,
    listarOp: `${base}/listarOp`,
    actualizarOp: `${base}/actualizarOp`,
    listarOpProductos: `${base}/listarOpProductos`,
    getOpProductosRaw: `${base}/getOpProductosRaw`,
    buscar: `${base}/buscarRMA`,
    eliminar: `${base}/eliminarRma`,
    actualizarProducto: `${base}/actualizarProductoRma`,
    getPorCliente: `${base}/getRmaCliente`,
    cargarRmaNoEntregado: `${base}/cargarRmaNoEntregados`
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
    actualizarProducto: `${base}/actualizarProductoInventario`,
    resetearConteos: `${base}/resetearConteos`,
    productosInactivos: `${base}/productosInactivos`,
    actualizarcantidadPorBulto: `${base}/actualizarcantidadPorBulto`
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
    limpiar: `${base}/limpiarReposiciones`,
  },
  stock: {
    obtener: `${base}/obtenerStock`,
    actualizarOp: `${base}/actualizarOp`,
    crearLote: `${base}/crearLoteDescarga`,
    confirmarLote: `${base}/confirmarLote`,
    revertirLote: `${base}/revertirLote`,
    listarLotes: `${base}/listarLotes`,
    eliminarLote: `${base}/eliminarLote`
  },
  kits: {
    guardarKit: `${base}/guardarKit`
  },
  backup: {
    getBackup: `${base}/backup`
  },
  ProductosConDescuento: {
    listar: `${base}/getProductosConDescuento`,
    ListarVendidos: `${base}/getProductosConDescuentoVendidos`,
    guardarVenta: `${base}/postGuardarVentasConDescuento`,
    eliminarOrdenes: `${base}/eliminarOrdenes`,
    verificarExistencia: `${base}/verificarExistenciaProductoDescuento`
  },
  apiMeli: {
    getVentas: `${base}/ventas?dias=`,
  }

};

export default Urls;
