import React, { useEffect } from 'react';

const Loader = () => {
  useEffect(() => {
   
  }, []);


  return (
    <div 
      style={
        {
          position: 'fixed',
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '1060', 
          overflowX: 'hidden',
          overflowY: 'auto',
        }
      }
>
        <div style={{
  animation: 'spin 1s linear infinite',
  borderRadius: '9999px', // equivalente a rounded-full
  height: '5rem',        // h-20 → 20 * 0.25rem = 5rem
  width: '5rem',         // w-20 → 5rem
  borderTopWidth: '4px',
  borderBottomWidth: '4px',
  borderTopColor: '#3b82f6',   // border-blue-500
  borderBottomColor: '#3b82f6',
  borderLeftColor: 'transparent',
  borderRightColor: 'transparent',
  borderStyle: 'solid',
}}></div>
      </div>
    /*<div className="loader">
      <div className="spinner"></div>
    </div>*/
  );
};

export default Loader;
/*

  
  display: 'flex',
  flex-direction: 'column',
  align-items: 'center',
  justify-content: 'center',
  z-index: '1060', 
  overflow-x: 'hidden',
  overflow-y: 'auto',
    }}
*/