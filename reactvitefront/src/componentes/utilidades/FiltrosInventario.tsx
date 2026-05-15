// FiltrosInventario.tsx
import React from "react";

interface FiltrosInventarioProps {
  filtro: string;
  setFiltro: (value: string) => void;
  skuABuscar: string;
  setSkuABuscar: (value: string) => void;
  bloqueSeleccionado: string;
  setBloqueSeleccionado: (value: string) => void;
  bloques: string[];
  // === NUEVAS PROPS PARA FILTROS RÁPIDOS ===
  filtroNoContado?: boolean;
  setFiltroNoContado?: (value: boolean) => void;
  filtroConDiferencia?: boolean;
  setFiltroConDiferencia?: (value: boolean) => void;
}

export const FiltrosInventario: React.FC<FiltrosInventarioProps> = ({
  filtro,
  setFiltro,
  skuABuscar,
  setSkuABuscar,
  bloqueSeleccionado,
  setBloqueSeleccionado,
  bloques,
  filtroNoContado = false,
  setFiltroNoContado = () => {},
  filtroConDiferencia = false,
  setFiltroConDiferencia = () => {},
}) => {
  const hayFiltrosActivos = filtroNoContado || filtroConDiferencia;

  return (
    <>
      {/* Fila 1: Filtros existentes */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem',
        flexWrap: 'wrap'
      }}>
        {/* FILTRAR SKU */}
        <div style={{
          backgroundColor: 'white',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid #d1d5db',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          flex: 1,
          minWidth: '200px'
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


        {/* BLOQUE */}
        <div style={{
          backgroundColor: 'white',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid #d1d5db',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          flex: 1,
          minWidth: '200px'
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

      {/* Fila 2: Filtros rápidos con checkboxes */}
      <div style={{
        backgroundColor: '#f9fafb',
        padding: '0.75rem 1rem',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        flexWrap: 'wrap'
      }}>
        
        
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
          color: '#1f2937',
          userSelect: 'none'
        }}>
          <input
            type="checkbox"
            checked={filtroNoContado}
            onChange={(e) => setFiltroNoContado(e.target.checked)}
            style={{
              width: '1rem',
              height: '1rem',
              cursor: 'pointer',
              accentColor: '#f59e0b'
            }}
          />
          <span>📋 No contados</span>
        </label>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
          color: '#1f2937',
          userSelect: 'none'
        }}>
          <input
            type="checkbox"
            checked={filtroConDiferencia}
            onChange={(e) => setFiltroConDiferencia(e.target.checked)}
            style={{
              width: '1rem',
              height: '1rem',
              cursor: 'pointer',
              accentColor: '#ef4444'
            }}
          />
          <span>⚠️ Con diferencia</span>
        </label>

        {hayFiltrosActivos && (
          <button
            onClick={() => {
              setFiltroNoContado(false);
              setFiltroConDiferencia(false);
            }}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '500',
              marginLeft: 'auto'
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </>
  );
};