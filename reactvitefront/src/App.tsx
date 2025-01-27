import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './rutas/AuthContext';
import { Rutas } from './rutas/rutas';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Rutas />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
