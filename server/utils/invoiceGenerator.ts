import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order, OrderItem, Invoice } from "@shared/schema";

interface InvoiceData {
  invoice: Invoice;
  order: Order;
  orderItems: OrderItem[];
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  restaurantGSTIN?: string;
}

export function generateInvoicePDF(data: InvoiceData): Buffer {
  const { invoice, order, orderItems, restaurantName = "Restaurant POS", restaurantAddress = "", restaurantPhone = "", restaurantGSTIN = "" } = data;
  
  if (!invoice || !order || !orderItems) {
    throw new Error("Missing required data for PDF generation");
  }
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(restaurantName, pageWidth / 2, yPosition, { align: "center" });
  
  if (restaurantAddress) {
    yPosition += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(restaurantAddress, pageWidth / 2, yPosition, { align: "center" });
  }
  
  if (restaurantPhone) {
    yPosition += 5;
    doc.text(`Phone: ${restaurantPhone}`, pageWidth / 2, yPosition, { align: "center" });
  }
  
  if (restaurantGSTIN) {
    yPosition += 5;
    doc.text(`GSTIN: ${restaurantGSTIN}`, pageWidth / 2, yPosition, { align: "center" });
  }

  yPosition += 10;
  doc.setLineWidth(0.5);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 10;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  
  if (order.orderType === "delivery") {
    doc.text("DELIVERY INVOICE", pageWidth / 2, yPosition, { align: "center" });
  } else if (order.orderType === "pickup") {
    doc.text("PICKUP INVOICE", pageWidth / 2, yPosition, { align: "center" });
  } else {
    doc.text("DINE-IN INVOICE", pageWidth / 2, yPosition, { align: "center" });
  }
  
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const invoiceDate = invoice.createdAt instanceof Date 
    ? invoice.createdAt 
    : new Date(invoice.createdAt || Date.now());
  
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 15, yPosition);
  doc.text(`Date: ${invoiceDate.toLocaleString()}`, pageWidth - 15, yPosition, { align: "right" });
  
  yPosition += 7;

  if (order.orderType === "dine-in" && invoice.tableNumber) {
    doc.text(`Table: ${invoice.tableNumber}`, 15, yPosition);
    if (invoice.floorName) {
      doc.text(`Floor: ${invoice.floorName}`, 60, yPosition);
    }
  } else if ((order.orderType === "delivery" || order.orderType === "pickup") && invoice.customerName) {
    doc.text(`Customer: ${invoice.customerName}`, 15, yPosition);
    if (invoice.customerPhone) {
      doc.text(`Phone: ${invoice.customerPhone}`, pageWidth - 15, yPosition, { align: "right" });
    }
    
    if (order.orderType === "delivery" && order.customerAddress) {
      yPosition += 7;
      doc.text(`Address: ${order.customerAddress}`, 15, yPosition);
    }
  }
  
  yPosition += 10;

  const tableData = orderItems.map(item => [
    item.name + (item.isVeg ? " 🌱" : ""),
    item.quantity.toString(),
    `₹${parseFloat(item.price).toFixed(2)}`,
    `₹${(parseFloat(item.price) * item.quantity).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [["Item", "Qty", "Price", "Total"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [231, 76, 60], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  const subtotal = parseFloat(invoice.subtotal);
  const tax = parseFloat(invoice.tax);
  const discount = parseFloat(invoice.discount || "0");
  const total = parseFloat(invoice.total);

  doc.setFontSize(11);
  const summaryX = pageWidth - 70;
  
  doc.text("Subtotal:", summaryX, yPosition);
  doc.text(`₹${subtotal.toFixed(2)}`, pageWidth - 15, yPosition, { align: "right" });
  
  yPosition += 7;
  doc.text("Tax (5%):", summaryX, yPosition);
  doc.text(`₹${tax.toFixed(2)}`, pageWidth - 15, yPosition, { align: "right" });
  
  if (discount > 0) {
    yPosition += 7;
    doc.text("Discount:", summaryX, yPosition);
    doc.text(`-₹${discount.toFixed(2)}`, pageWidth - 15, yPosition, { align: "right" });
  }
  
  yPosition += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Grand Total:", summaryX, yPosition);
  doc.text(`₹${total.toFixed(2)}`, pageWidth - 15, yPosition, { align: "right" });

  yPosition += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  const paymentText = invoice.splitPayments 
    ? `Split Payment (${JSON.parse(invoice.splitPayments).length} ways)`
    : `Payment Mode: ${invoice.paymentMode?.toUpperCase() || "CASH"}`;
  
  doc.text(paymentText, summaryX, yPosition);
  doc.text("PAID", pageWidth - 15, yPosition, { align: "right" });

  if (order.orderType === "delivery") {
    yPosition += 15;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("This is a delivery order. Please ensure items are delivered to the customer address.", 15, yPosition);
  } else if (order.orderType === "pickup") {
    yPosition += 15;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("This is a pickup order. Customer will collect the items from the restaurant.", 15, yPosition);
  }

  yPosition = doc.internal.pageSize.getHeight() - 30;
  doc.setLineWidth(0.3);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 7;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your business!", pageWidth / 2, yPosition, { align: "center" });
  
  yPosition += 5;
  doc.setFontSize(8);
  doc.text("This is a computer-generated invoice and does not require a signature.", pageWidth / 2, yPosition, { align: "center" });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return pdfBuffer;
}
