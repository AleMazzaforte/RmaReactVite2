



import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cookieParser from 'cookie-parser';
import rutas from './rutas/rutas.js';
import cors from 'cors';

dotenv.config();

const port = process.env.PORT || 3000;
const app = express();

// Para obtener el __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, 'rma-vite', 'dist')));

// Middleware para procesar formularios
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Usar las rutas importadas
app.use('/', rutas);

if (process.env.NODE_ENV === 'production') {
    app.use(express.static('rma-vite/dist'));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'rma-vite', 'dist', 'index.html'));
    });
    
} else {
    app.get('/', (req, res) => {
        res.send('Servidor corriendo');
    });
}




app.listen(port, () => {
    console.log(`Servidor corriendo en puerto: ${port}`);
});
