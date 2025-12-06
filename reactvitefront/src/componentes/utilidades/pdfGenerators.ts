import jsPDF from "jspdf";

// Tipos necesarios (los mismos que en Api.tsx)
interface OrderItem {
  sku: string;
  quantity: number;
  description: string;
}

interface Order {
  numeroOperacion: string;
  buyer_nickname: string;
  seller_nickname: string;
  date_created: string;
  etiqueta_impresa: boolean;
  tipo_envio: string;
  items: OrderItem[];
  buyer_full_name?: string;
}

// ✅ Mapeo visual para tipo_envio (copiado)
const getTipoEnvioLabel = (tipo: string): string => {
  const labels: Record<string, string> = {
    full: "Envío Full",
    mercado_envios: "Mercado Envíos",
    flex: "Flex",
    vendedor: "Vendedor",
    retiro_local: "Retiro en local",
    cancelada: "❌ Cancelada",
    desconocido: "Desconocido"
  };
  return labels[tipo] || tipo;
};

// 🔸 Generador 1: PDF para envíos (formato tarjeta)
export const generateEnviosPDF = (orders: Order[], selectedOrders: Set<string>) => {
  const selectedOrdersList = orders.filter((o) => selectedOrders.has(o.numeroOperacion));

  if (selectedOrdersList.length === 0) {
    alert("Por favor, selecciona al menos una orden.");
    return;
  }

  const doc = new jsPDF("p", "mm", "a4");
  const margin = 10;
  const pageWidth = 210;
  const cardWidth = pageWidth - 2 * margin;
  let yPos = margin;

  const controllers = ["Javi", "Ro", "Lu", "Rodri"];
  const checkboxSize = 3.5;
  const checkboxSpacing = 15;

  selectedOrdersList.forEach((order, index) => {
    if (index > 0 && index % 3 === 0) {
      doc.addPage();
      yPos = margin;
    }

    const startY = yPos;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Orden #${order.numeroOperacion}`, margin + 5, yPos + 10);

    const tipoEnvioLabel = getTipoEnvioLabel(order.tipo_envio);
    doc.setFont("helvetica", "normal");
    doc.text(`Tipo: ${tipoEnvioLabel}`, margin + 76, yPos + 10);

    const badgeText = order.etiqueta_impresa
      ? "Etiqueta generada"
      : "Sin etiqueta";
    const badgeWidth = doc.getTextWidth(badgeText) + 6;
    const badgeX = margin + cardWidth - badgeWidth - 3;
    const badgeY = yPos + 6;
    doc.setFillColor(
      order.etiqueta_impresa ? 220 : 255,
      order.etiqueta_impresa ? 255 : 255,
      220
    );
    doc.rect(badgeX, badgeY, badgeWidth, 8, "F");
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(badgeText, badgeX + 3, badgeY + 5);

    let currentY = yPos + 18;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Comprador: ${order.buyer_full_name} (${order.buyer_nickname})`, margin + 5, currentY);
    currentY += 6;
    doc.text(`Vendedor: ${order.seller_nickname}`, margin + 5, currentY);
    currentY += 6;
    const formattedDate = new Date(order.date_created).toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    doc.text(`Fecha: ${formattedDate}`, margin + 5, currentY);
    currentY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    order.items.forEach((item) => {
      doc.rect(margin + 5, currentY - 3, checkboxSize, checkboxSize);
      doc.text(`${item.sku} — ${item.quantity} Un. ${item.description}`, margin + 11, currentY);
      currentY += 5;
    });

    currentY += 4;
    doc.setFont("helvetica", "normal");
    doc.text("Controló:", margin + 5, currentY);

    let ctrlX = margin + 25;
    controllers.forEach((name) => {
      doc.rect(ctrlX, currentY - 2, checkboxSize, checkboxSize);
      doc.text(name, ctrlX + checkboxSize + 2, currentY);
      ctrlX += checkboxSize + 2 + doc.getTextWidth(name) + checkboxSpacing;
    });

    const cardHeight = currentY - startY + 6;

    if (startY + cardHeight > 297 - margin) {
      doc.addPage();
      yPos = margin;
    }

    doc.setDrawColor(0, 0, 0);
    doc.rect(margin, startY, cardWidth, cardHeight);
    yPos = startY + cardHeight + 8;
  });

  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};

// 🔸 Generador 2: PDF para retiro en local (constancia de entrega)
export const generateRetiroLocalPDF = (orders: Order[], selectedOrders: Set<string>) => {
  const selectedRetiroOrders = orders.filter(
    (o) => selectedOrders.has(o.numeroOperacion) && o.tipo_envio === "retiro_local"
  );

  if (selectedRetiroOrders.length === 0) {
    alert("Por favor, selecciona al menos una orden de 'Retiro en local'.");
    return;
  }

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const margin = 15;

  selectedRetiroOrders.forEach((order, index) => {
    if (index > 0) {
      doc.addPage();
    }

    const now = new Date();
    const fechaActual = now.toLocaleDateString("es-AR");

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Constancia de entrega", pageWidth / 2, 25, { align: "center" });

    doc.setLineWidth(0.5);
    doc.line(margin, 35, pageWidth - margin, 35);

    let yPos = 45;

    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    const nombreCliente = order.buyer_full_name || "Cliente no especificado";
    doc.text(`Nombre: ${nombreCliente}`, margin, yPos);
    yPos += 10;

    doc.text(`Fecha: ${fechaActual}`, margin, yPos);
    yPos += 15;

    doc.setFont("helvetica", "bold");
    doc.text("Productos:", margin, yPos);
    yPos += 8;
    doc.setFont("helvetica", "normal");

    order.items.forEach((item) => {
      const line = `• ${item.sku} — ${item.quantity} un. ${item.description}`;
      doc.text(line, margin + 5, yPos);
      yPos += 7;
    });

    yPos += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Observaciones:", margin, yPos);
    yPos += 8;
    doc.setDrawColor(0);
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 25);
    yPos += 30;

    doc.setFont("helvetica", "bold");
    doc.text("Controló:", margin, yPos);
    yPos += 8;

    const controllers = ["Javi", "Lu", "Rodri"];
    const checkboxSize = 4;
    let currentX = margin;

    controllers.forEach((name) => {
      doc.rect(currentX, yPos - 2, checkboxSize, checkboxSize);
      doc.setFont("helvetica", "normal");
      doc.text(name, currentX + checkboxSize + 2, yPos);
      const nameWidth = doc.getTextWidth(name);
      currentX += checkboxSize + 2 + nameWidth + 15;
    });

    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100);
    doc.text("Documento válido para retiro en local", pageWidth / 2, 285, { align: "center" });
  });

  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, "_blank");
};