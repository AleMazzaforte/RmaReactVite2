import { useState, useRef, useEffect } from "react";
import { ListarProductos } from "./utilidades/ListarProductos";
import { Contenedor } from "./utilidades/Contenedor";
import Urls from "./utilidades/Urls";
import { sweetAlert } from "./utilidades/SweetAlertWrapper"; // Asegúrate de tenerlo importado
import Loader from "./utilidades/Loader"; // Si usas el loader

interface Producto {
  id: string;
  sku: string;
}

const urlProductos = Urls.productos.listar;
const urlGuardarKit = Urls.kits.guardarKit;

export const CargarKits: React.FC = () => {
  const [kit, setKit] = useState<Producto | null>(null);
  const [cartuchos, setCartuchos] = useState<(Producto | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [loading, setLoading] = useState(false);

  const kitInputRef = useRef<HTMLInputElement>(null);
  const cartuchoRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
  const root = document.getElementById('root');
  if (root && root.getAttribute('aria-hidden') === 'true') {
    root.removeAttribute('aria-hidden');
  }

  // Opcional: también limpiar cualquier atributo residual de SweetAlert
  if (root?.hasAttribute('data-previous-aria-hidden')) {
    root.removeAttribute('data-previous-aria-hidden');
  }
}, []);

  const handleKitSeleccionado = (producto: Producto) => {
    setKit(producto);
    if (kitInputRef.current) {
      kitInputRef.current.focus();
    }
  };

  const handleCartuchoSeleccionado = (index: number) => (producto: Producto) => {
    const nuevosCartuchos = [...cartuchos];
    nuevosCartuchos[index] = producto;
    setCartuchos(nuevosCartuchos);
  };

  const limpiarFormulario = () => {
    setKit(null);
    setCartuchos([null, null, null, null]);
    if (kitInputRef.current) {
      kitInputRef.current.value = "";
      kitInputRef.current.focus();
    }
    // Opcional: limpiar inputs de cartuchos si usan value directo
  };

  const enviarFormulario = async () => {
    // ✅ Validaciones
    if (!kit) {
      sweetAlert.fire({
        icon: "warning",
        title: "Kit requerido",
        text: "Debe seleccionar un producto como kit.",
      });
      return;
    }

    const cartuchosValidos = cartuchos.filter((c) => c !== null);
    if (cartuchosValidos.length === 0) {
      sweetAlert.fire({
        icon: "warning",
        title: "Cartuchos requeridos",
        text: "Debe seleccionar al menos un cartucho.",
      });
      return;
    }

    // ✅ Preparar datos para enviar
    const datos = {
      idKit: kit.id,
      skusCartuchos: cartuchosValidos.map((c) => c!.id), // c! porque ya filtramos los null
    };

    try {
      setLoading(true);

      const response = await fetch(urlGuardarKit, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      });

      if (response.ok) {
        sweetAlert.fire({
          icon: "success",
          title: "¡Éxito!",
          text: "El kit se guardó correctamente.",
        });
        limpiarFormulario();
      } else {
        const errorData = await response.json().catch(() => ({}));
        sweetAlert.fire({
          icon: "error",
          title: "Error al guardar",
          text: errorData.message || "No se pudo guardar el kit. Intente nuevamente.",
        });
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      sweetAlert.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor. Verifique su conexión.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute justify-end w-full h-full p-4">
      <Contenedor>
        <div>
          <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
            Cargar Kit
          </h2>

          {loading && <Loader />}

          <div className="space-y-6">
            {/* Kit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kit<span className="text-red-500">*</span>:
              </label>
              <ListarProductos
                endpoint={urlProductos}
                onProductoSeleccionado={handleKitSeleccionado}
                campos={["sku"]}
                inputRef={kitInputRef}
                value={kit ? kit.sku : ""}
              />
            </div>

            {/* Cartuchos */}
            {cartuchos.map((cartucho, index) => (
              <div key={`cartucho-${index}`}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cartucho {index + 1}:
                </label>
                <ListarProductos
                  endpoint={urlProductos}
                  onProductoSeleccionado={handleCartuchoSeleccionado(index)}
                  campos={["sku"]}
                  inputRef={cartuchoRefs[index]}
                  value={cartucho ? cartucho.sku : ""}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={enviarFormulario}
              disabled={loading}
              className={`w-full py-2 px-4 font-semibold rounded-lg focus:outline-black focus:ring focus:ring-blue-300 ${
                loading
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {loading ? "Guardando..." : "Guardar Kit"}
            </button>
          </div>
        </div>
      </Contenedor>
    </div>
  );
};