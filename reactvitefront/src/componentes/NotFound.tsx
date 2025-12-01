
import { NavBar } from '../plantillas/NavBar';

export const NotFound = (): JSX.Element => {
  return (
    <>
      <NavBar />
      <div className="flex flex-col items-center justify-center min-h-20 ">
        <h1 className="text-4xl font-bold text-red-800 mb-4">Recurso No Encontrado</h1>
        <p className="text-lg text-gray-600">La página que estás buscando no existe.</p>
      </div>
    </>
  );
};
