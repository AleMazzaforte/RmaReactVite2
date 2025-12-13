import express from 'express';
import {
    clienteController,
    productosGeneralController,
    cargarRma,
    gestionarRma,
} from '../controladores/rmaController.js';

import { postLogin } from '../controladores/loginController.js';
import { getLogo } from '../controladores/logoController.js';
import usuario from '../controladores/usuarioController.js';
import gestionClientes from '../controladores/clienteController.js';
import listarOp from '../controladores/opController.js';
import productosController from '../controladores/productosController.js';
import { marcas } from '../controladores/marcasController.js';
import transportes from '../controladores/transportesController.js';
import etiquetas from '../controladores/etiquetasController.js';
import agregarDevolucion from '../controladores/devolucionController.js';
import estadisticas from '../controladores/estadisticasController.js'
import inventarioController from '../controladores/inventarioController.js'
import kitsController from '../controladores/kitController.js'
import backupController from '../controladores/backupController.js'
import apiController from '../controladores/apiController.js'
import { productosConDescuentoController } from '../controladores/productosConDescuentoController.js';


const router = express.Router();

//Logo
router.get('/logo', getLogo);

router.post('/login', postLogin);

// Ruta para clientes
router.post('/cargarCliente', gestionClientes.cargarCliente);
router.get('/listarCliente', gestionClientes.listarClientesParaActualizar);
router.post('/actualizarCliente/:idCliente', gestionClientes.actualizarCliente);
router.delete('/eliminarCliente/:idCliente', gestionClientes.eliminarCliente);

// Ruta para OP
router.get('/listarOp/:query', listarOp.getListarOp);
router.post('/guardarOp', listarOp.postGuardarOp);
router.post('/guardarOpProductos', listarOp.postGuardarOpProductos);
router.get('/listarOpProductos/:idOp', listarOp.getListarOpProductos);
router.get('/getOpProductosRaw/:idOp', listarOp.getOpProductosRaw);
router.get('/getSku/:idsProductos', listarOp.getSku);
router.post('/actualizarOp', listarOp.postActualizarOp);
router.post('/agregarProductoOp', listarOp.postAgregarProductoOp);
// En tu archivo de rutas
router.delete('/eliminarProductoOp', listarOp.eliminarProductoOp);

// Ruta para listar clientes
router.get('/buscarCliente', clienteController.getListarClientesRma);

// Ruta para productos
router.post('/cargarProducto', productosController.postCargarProducto);
router.get('/listarProductos', productosGeneralController.getListarProductos);
router.post('/actualizarProducto/', productosController.postActualizarProductos);
router.post('/eliminarProducto/:sku', productosController.postELiminarProducto);

// Ruta para marcas
router.get('/listarMarcas', marcas.getListarMarcas);
router.post('/cargarMarca', marcas.postCargarMarca);
router.post('/actualizarMarca', marcas.postActualizarMarca);
router.post('/eliminarMarca', marcas.postEliminarMarca);

// Ruta para RMA
router.post('/agregarRma', cargarRma.postAgregarRma);
router.get('/getRmaCLiente/:idCliente', gestionarRma.getListarProductosRma);
router.post('/actualizarProductoRma/:idRma', gestionarRma.postActualizarCliente);
router.delete('/eliminarRma/:idRma', gestionarRma.deleteRma);
router.get('/getUltimoNIngreso', cargarRma.getUltimoNum);
router.get('/cargarRmaNoEntregados', gestionarRma.getRmaNoEntregados);


//Ruta para Stock
router.get('/obtenerStock', gestionarRma.getStockRMA);
router.post('/actualizarOp/:idRma', gestionarRma.postActualizarOpPorSku);


//Ruta para agregar devoluciones
router.post('/agregarDevolucion', agregarDevolucion.postAgregarDevolucion);

//Ruta para agregar usuario
router.post('/cargarUsuario', usuario.postCargarUsuario);

//Rutas para transportes
router.post('/cargarTransporte', transportes.postCargarTransporte);
router.post('/actualizarTransporte', transportes.postActualizarTransporte);
router.post('/eliminarTransporte', transportes.postEliminarTransporte);
router.get('/buscarTransporte', transportes.getBuscarTransporte);

//Rutas para etiquetas
router.get('/buscarRMA', etiquetas.getBuscarRma);

//Rutas para estadisticas
router.get('/api/Estadisticas/rma', estadisticas.getEstadisticasRMA);

//rutas para Inventario
router.get('/prepararInventario', inventarioController.getPrepararInventario);
router.put('/actualizarBloques', inventarioController.putActualizarBloques);
router.put('/actualizarProductoInventario', inventarioController.putActualizarProductoInventario);
router.put('/guardarInventario', inventarioController.putGuardarInventario);
router.put('/resetearConteos', inventarioController.putResetearConteos);
router.put('/actualizarCantidadPorBulto', inventarioController.putactualizarCantidadPorBulto);
router.get('/productosInactivos', inventarioController.getProductosInactivos);
router.post('/inactivarProducto', productosController.postInactivarProducto)
//Inventario reposicion
router.post('/guardarReposicion', inventarioController.postGuardarReposicion);
router.get('/obtenerReposiciones', inventarioController.getObtenerReposiciones);
router.post('/limpiarReposiciones', inventarioController.postLimpiarReposiciones);

// Rutas para kits
router.post('/guardarKit', kitsController.postGuardarKit)

// Ruta para backup
router.get('/backup', backupController.getBackup)

// Rutas para api
router.get('/ventas', apiController.getVentas);
router.post('/tokens', apiController.saveTokens);

// RutasProductos con descuento
router.get('/getProductosConDescuento', productosConDescuentoController.getProductosConDescuento);
router.get('/getProductosConDescuentoVendidos', productosConDescuentoController.getProductosConDescuentoVendidos);
router.post('/postGuardarVentasConDescuento', productosConDescuentoController.postGuardarVentasConDescuento);
router.post('/eliminarOrdenes', productosConDescuentoController.eliminarOrdenes);
router.post('/verificarExistenciaProductoDescuento', productosConDescuentoController.verificarExistencia);
export default router;
