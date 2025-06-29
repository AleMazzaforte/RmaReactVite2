import React, { useEffect, useState } from 'react'


interface ContenedorProps {
    children?: React.ReactNode;
  }


export const Contenedor: React.FC<ContenedorProps> = ({ children }) =>{
  const [logoSrc, setLogoSrc] = useState<string | null>(null)

  let urlogo = 'https://rma-back.vercel.app/logo';
  if (window.location.hostname === 'localhost') {
    urlogo = 'http://localhost:8080/logo';
    }

  useEffect(() => {
    fetch(urlogo) // o tu ruta en producción
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        setLogoSrc(url)
      })
      .catch((err) => console.error('Error al cargar logo:', err))
  }, [])

  return (
    <div className='flex'>
      <div
        className="w-full max-w-xl bg-white rounded-lg shadow-lg shadow-gray-500 p-8 mx-auto mb-6"
        style={{ maxWidth: '590px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}
      >
        <div className="flex justify-center mb-6">
          <div className="h-20 bg-gray-100  flex items-center justify-center overflow-hidden">
            {logoSrc ? (
              <img src={logoSrc} alt="Logo" className="h-full w-full object-cover" />
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

