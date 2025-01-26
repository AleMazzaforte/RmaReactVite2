import { BrowserRouter } from "react-router-dom";
import { Rutas } from "./rutas/rutas";

const App = () => {
  return (
    <BrowserRouter>
      <Rutas />
    </BrowserRouter>
  );
};

export default App;
