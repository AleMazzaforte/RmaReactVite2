import { useEffect, useState } from 'react'
import logo from '../../img/logo.png';

interface ContenedorProps {
    children?: React.ReactNode;
  }

export const Contenedor: React.FC<ContenedorProps> = ({ children }) =>{
  

  return (
    <div className='flex'>
      <div
        className="w-full max-w-xl bg-white rounded-lg shadow-lg shadow-gray-500 p-8 mx-auto mb-6"
        style={{ maxWidth: '590px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}
      >
        <div className="flex justify-center mb-6">
          <div className="h-20 bg-gray-100  flex items-center justify-center overflow-hidden">
            {logo ? (
              <img src={logo} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-gray-600 p-2.5 bo font-bold text-sm">LOGO</span>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

