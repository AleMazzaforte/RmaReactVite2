import express from 'express';
import { 
    clienteController, 
    productosGeneralController, 
    listarMarcas, 
    cargarRma, 
    gestionarRma,  
} from '../controladores/rmaController.js';

import { postLogin } from '../controladores/loginController.js';
import  usuario  from '../controladores/usuarioController.js';
import gestionClientes from '../controladores/clienteController.js';
import listarOp from '../controladores/opController.js';
import productosController from '../controladores/productosController.js';

const router = express.Router();

router.post('/login', postLogin);
//Ruta para cargar clientes




// Ruta para clientes
router.post('/cargarCliente', gestionClientes.cargarCliente);
router.get('/listarCliente', gestionClientes.listarClientesParaActualizar);
router.post('/actualizarCliente/:idCliente', gestionClientes.actualizarCliente);

// Ruta para listar OP
router.get('/listarOp', listarOp.getListarOp);


// Ruta para listar clientes
router.get('/buscarCliente', clienteController.getListarClientesRma);

// Ruta para productos
router.post('/cargarProducto', productosController.postCargarProducto);
router.get('/listarProductos', productosGeneralController.getListarProductos);
router.post('/actualizarProducto/:sku', productosController.postActualizarProductos);

// Ruta para listar marcas
router.get('/listarMarcas', listarMarcas.getListarMarcas);

// Ruta para agregar RMA
router.post('/agregarRma',  cargarRma.postAgregarRma);
//router.get('/getRmaCLiente', gestionarRma.getListarRma);
router.get('/getRmaCLiente/:idCliente', gestionarRma.getListarProductosRma);
router.post('/actualizarProductoRma/:idRma', gestionarRma.postActualizarCliente); 
router.delete('/eliminarRma/:idRma', gestionarRma.deleteRma);

//Ruta para agregar usuario
router.post('/cargarUsuario', usuario.postCargarUsuario);
export default router;
