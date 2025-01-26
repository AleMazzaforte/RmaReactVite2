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

const router = express.Router();

router.post('/login', postLogin);
// Ruta para listar clientes
router.get('/buscarCliente', clienteController.getListarClientesRma);

// Ruta para listar productos
router.get('/buscarProductos', productosGeneralController.getListarProductos);

// Ruta para listar marcas
router.get('/listarMarcas', listarMarcas.getListarMarcas);

// Ruta para agregar RMA
router.post('/agregarRma',  cargarRma.postAgregarRma);
router.get('/getRmaCLiente/:idCliente', gestionarRma.getListarProductosRma);
router.post('/actualizarProductoRma/:idRma', gestionarRma.postActualizarCliente); 
router.delete('/eliminarRma/:idRma', gestionarRma.deleteRma);

//Ruta para agregar usuario
router.post('/cargarUsuario', usuario.postCargarUsuario);
export default router;
