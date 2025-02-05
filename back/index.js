import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cookieParser from 'cookie-parser';
import rutas from './rutas/rutas.js';
import cors from 'cors';

dotenv.config();

const port = process.env.PORT || 8080;
const app = express();

// Para obtener el __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//app.use(express.static(path.join(__dirname, 'reactvitefront', 'dist')));

// Middleware para procesar formularios
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(cors());

app.use(cookieParser());

// Usar las rutas importadas
app.use('/', rutas);

// Configuración para producción
if (process.env.NODE_ENV === 'production') {
    // Ruta absoluta a la carpeta del frontend
    const frontendPath = path.join(__dirname, '..', 'reactvitefront', 'dist');
    
    // Servir archivos estáticos del frontend
    app.use(express.static(frontendPath));

    // Capturar todas las rutas y enviar el archivo index.html
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
} else {
    // Ruta de prueba para desarrollo
    app.get('/', (req, res) => {
        res.send(`Servidor corriendo en el puerto: ${port}`);
    });
}

app.listen(port, () => {
    console.log(`Servidor corriendo en puerto: ${port}`);
});
