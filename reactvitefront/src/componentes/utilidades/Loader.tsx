import React, { useEffect } from 'react';

const Loader = () => {
  useEffect(() => {
    // Agrega la clase de desenfoque al body cuando se monta el componente
    document.body.classList.add('backdrop-blur-lg');

    // Elimina la clase de desenfoque del body cuando se desmonta el componente
    return () => {
      document.body.classList.remove('backdrop-blur-lg');
    };
  }, []);

  return (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-18 w-18 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    /*<div className="loader">
      <div className="spinner"></div>
    </div>*/
  );
};

export default Loader;
