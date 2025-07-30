interface Producto {
  id: number;
  sku: string;
  idBloque: string;
  cantSistemaFemex: number;
  cantSistemaBlow: number;
  conteoFisico: number | null;
  fechaConteo: string | null;
  cantidadPorBulto: number;
}


export const ModalCoincidencias = ({
  titulo,
  mensaje,
  coincidencias,
  skuSeleccionado,
  setSkuSeleccionado,
  onConfirmar,
  onCancelar
}: {
  titulo: string;
  mensaje: string;
  coincidencias: Producto[];
  skuSeleccionado: string;
  setSkuSeleccionado: (sku: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
}) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
    }}
  >
    <div
      style={{
        backgroundColor: "white",
        padding: "1.5rem",
        borderRadius: "0.5rem",
        maxWidth: "32rem",
        width: "100%",
      }}
    >
      <h3
        style={{
          fontSize: "1.125rem",
          fontWeight: "bold",
          marginBottom: "1rem",
        }}
      >
        {titulo}
      </h3>
      <p style={{ marginBottom: "1rem" }}>{mensaje}</p>
      <div
        style={{
          maxHeight: "15rem",
          overflowY: "auto",
          marginBottom: "1rem",
        }}
      >
        {coincidencias.slice(0, 10).map((producto) => (
          <label
            key={producto.id}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0.5rem",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="skuSeleccionado"
              value={producto.sku}
              checked={skuSeleccionado === producto.sku}
              onChange={() => setSkuSeleccionado(producto.sku)}
              style={{ marginRight: "0.5rem" }}
            />
            {producto.sku}
          </label>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.5rem",
        }}
      >
        <button
          onClick={onCancelar}
          style={{
            backgroundColor: "#6b7280",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={onConfirmar}
          style={{
            backgroundColor: "#3b82f6",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
          }}
        >
          Aceptar
        </button>
      </div>
    </div>
  </div>
);