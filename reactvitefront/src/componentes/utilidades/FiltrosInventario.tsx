// FiltrosInventario.tsx
import React from "react";

interface FiltrosInventarioProps {
  filtro: string;
  setFiltro: (value: string) => void;
  skuABuscar: string;
  setSkuABuscar: (value: string) => void;
  handleBuscarSku: () => void;
  bloqueSeleccionado: string;
  setBloqueSeleccionado: (value: string) => void;
  bloques: string[];
}

export const FiltrosInventario: React.FC<FiltrosInventarioProps> = ({
  filtro,
  setFiltro,
  skuABuscar,
  setSkuABuscar,
  handleBuscarSku,
  bloqueSeleccionado,
  setBloqueSeleccionado,
  bloques,
}) => {
  return (
  <>
    {/* Contenedor principal para los tres filtros en línea */}
    <div style={{
      display: 'flex',
      gap: '1rem',
      marginBottom: '1rem'
    }}>
      {/* FILTRAR SKU */}
      <div style={{
        backgroundColor: 'white',
        padding: '0.75rem',
        borderRadius: '0.5rem',
        border: '1px solid #d1d5db',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        flex: 1
      }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '0.25rem'
        }}>
          Filtrar SKU
        </label>
        <input
          type="text"
          placeholder="Ej: EP504 N PI 130ML"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            backgroundColor: 'white',
            border: '1px solid #9ca3af',
            borderRadius: '0.375rem',
            outline: 'none',
            boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
            fontSize: '0.875rem',
            color: '#1f2937'
          }}
        />
      </div>

      {/* BUSCAR SKU */}
      <div style={{
        backgroundColor: 'white',
        padding: '0.75rem',
        borderRadius: '0.5rem',
        border: '1px solid #d1d5db',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        flex: 1
      }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '0.25rem'
        }}>
          Buscar SKU
        </label>
        <div style={{display: 'flex'}}>
          <input
            type="text"
            placeholder="Ej: EP504 N PI 130ML"
            value={skuABuscar}
            onChange={(e) => setSkuABuscar(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscarSku()}
            style={{
              flex: 1,
              padding: '0.5rem',
              backgroundColor: 'white',
              border: '1px solid #9ca3af',
              borderRadius: '0.375rem 0 0 0.375rem',
              outline: 'none',
              boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
              fontSize: '0.875rem',
              color: '#1f2937'
            }}
          />
          <button
            onClick={handleBuscarSku}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0 0.375rem 0.375rem 0',
              border: 'none',
              transition: 'background-color 0.2s',
              
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              style={{height: '1.25rem', width: '1.25rem'}}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* BLOQUE */}
      <div style={{
        backgroundColor: 'white',
        padding: '0.75rem',
        borderRadius: '0.5rem',
        border: '1px solid #d1d5db',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        flex: 1
      }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '0.25rem'
        }}>
          Bloque
        </label>
        <select
          value={bloqueSeleccionado}
          onChange={(e) => setBloqueSeleccionado(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            backgroundColor: 'white',
            border: '1px solid #9ca3af',
            borderRadius: '0.375rem',
            outline: 'none',
            boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
            fontSize: '0.875rem',
            color: '#1f2937'
          }}
        >
          <option value="">Todos los bloques</option>
          {bloques.map((bloque) => (
            <option key={bloque} value={bloque}>
              {bloque}
            </option>
          ))}
        </select>
      </div>
    </div>
  </>
);
};
