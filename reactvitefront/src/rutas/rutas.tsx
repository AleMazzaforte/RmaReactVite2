import { Routes, Route } from "react-router-dom";
import { LoginContainer }  from "../componentes/LoginContainer";
import { CargarRma } from "../componentes/CargarRma";
export const Rutas = () => {
  return (
    <Routes>
      <Route path="/" element= {<CargarRma />} />
      <Route path="/login" element= {<LoginContainer />} />
    </Routes>
  );
};

 