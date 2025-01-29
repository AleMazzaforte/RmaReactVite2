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
    <div className="loader">
      <div className="spinner"></div>
    </div>
  );
};

export default Loader;
