import React, { useEffect } from 'react';

const Loader = () => {
  useEffect(() => {
   
  }, []);


  return (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    /*<div className="loader">
      <div className="spinner"></div>
    </div>*/
  );
};

export default Loader;
