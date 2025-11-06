// components/Api.tsx
import React, { useState } from 'react';
import axios from 'axios';

// Tipos
interface OrderItem {
  sku: string;
  quantity: number;
}

interface ReceiverInfo {
  name: string;
  street: string;
  number: string;
  city: string;
  state: string;
  zip_code: string;
}

interface ShippingInfo {
  id: number | null;
  status: string | null;
  etiqueta_impresa: boolean;
}

export interface Order {
  id: number;
  status: string;
  date_created: string;
  shipping: ShippingInfo;
  items: OrderItem[];
  receiver_info: ReceiverInfo;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: Order[];
}

export const Api = () => {
  const [dias, setDias] = useState<number>(3);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchOrders = async () => {
    if (dias < 1 || dias > 30) {
      alert('Por favor, ingresa un valor entre 1 y 30.');
      return;
    }

    setLoading(true);
    setError(null);
    setOrders([]);

    try {
      const response = await axios.get<ApiResponse>(`http://localhost:8080/ventas?dias=${dias}`);
      const { data } = response;

      if (data.success && data.data) {
        setOrders(data.data);
      } else {
        setError(data.message || 'Error desconocido');
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Error al conectar con el servidor'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Órdenes de Mercado Libre</h2>

      <div className="mb-6 flex items-center gap-4">
        <label className="text-gray-700 font-medium">
          Últimos días:
          <input
            type="number"
            min="1"
            max="30"
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
            className="ml-2 w-20 px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </label>

        <button
          onClick={handleFetchOrders}
          disabled={loading}
          className={`px-4 py-2 rounded font-medium text-white transition ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Cargando...' : 'Obtener órdenes'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-100 text-red-700 rounded flex items-center">
          <span className="mr-2">❌</span> {error}
        </div>
      )}

      {orders.length > 0 && (
        <div>
          <p className="mb-4 text-gray-700">
            Se encontraron <span className="font-semibold">{orders.length}</span> órdenes:
          </p>

          <div className="space-y-5">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Orden #{order.id}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      order.shipping.etiqueta_impresa
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {order.shipping.etiqueta_impresa ? 'Etiqueta generada' : 'Sin etiqueta'}
                  </span>
                </div>

                
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Fecha:</span>{' '}
                  {new Date(order.date_created).toLocaleString('es-AR')}
                </p>

                <div className="mt-3">
                  <p className="font-medium text-gray-700">Items:</p>
                  <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                    {order.items.map((item, idx) => (
                      <li key={idx}>
                        SKU: <span className="font-mono">{item.sku}</span> — Cantidad: {item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="font-medium text-gray-700">Cliente: {order.receiver_info.name}</p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Dirección:</span>{' '}
                    {order.receiver_info.street} {order.receiver_info.number},{' '}
                    {order.receiver_info.city}, {order.receiver_info.state}{' '}
                    ({order.receiver_info.zip_code})
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};