import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertFloorSchema,
  insertTableSchema,
  insertMenuItemSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertInventoryItemSchema,
  insertInvoiceSchema,
  insertReservationSchema,
} from "@shared/schema";
import { z } from "zod";
import { fetchMenuItemsFromMongoDB } from "./mongodbService";

const orderActionSchema = z.object({
  print: z.boolean().optional().default(false),
});

const checkoutSchema = z.object({
  paymentMode: z.string().optional(),
  print: z.boolean().optional().default(false),
  splitPayments: z.array(z.object({
    person: z.number(),
    amount: z.number(),
    paymentMode: z.string(),
  })).optional(),
});

let wss: WebSocketServer;

function broadcastUpdate(type: string, data: any) {
  if (!wss) {
    console.log('[WebSocket] No WSS instance, cannot broadcast');
    return;
  }
  const message = JSON.stringify({ type, data });
  const clientCount = Array.from(wss.clients).filter(c => c.readyState === WebSocket.OPEN).length;
  console.log(`[WebSocket] Broadcasting ${type} to ${clientCount} clients`);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/floors", async (req, res) => {
    const floors = await storage.getFloors();
    res.json(floors);
  });

  app.get("/api/floors/:id", async (req, res) => {
    const floor = await storage.getFloor(req.params.id);
    if (!floor) {
      return res.status(404).json({ error: "Floor not found" });
    }
    res.json(floor);
  });

  app.post("/api/floors", async (req, res) => {
    const result = insertFloorSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const floor = await storage.createFloor(result.data);
    broadcastUpdate("floor_created", floor);
    res.json(floor);
  });

  app.patch("/api/floors/:id", async (req, res) => {
    const floor = await storage.updateFloor(req.params.id, req.body);
    if (!floor) {
      return res.status(404).json({ error: "Floor not found" });
    }
    broadcastUpdate("floor_updated", floor);
    res.json(floor);
  });

  app.delete("/api/floors/:id", async (req, res) => {
    const success = await storage.deleteFloor(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Floor not found" });
    }
    broadcastUpdate("floor_deleted", { id: req.params.id });
    res.json({ success: true });
  });

  app.get("/api/tables", async (req, res) => {
    const tables = await storage.getTables();
    res.json(tables);
  });

  app.get("/api/tables/:id", async (req, res) => {
    const table = await storage.getTable(req.params.id);
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }
    res.json(table);
  });

  app.post("/api/tables", async (req, res) => {
    const result = insertTableSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const table = await storage.createTable(result.data);
    broadcastUpdate("table_created", table);
    res.json(table);
  });

  app.patch("/api/tables/:id", async (req, res) => {
    const table = await storage.updateTable(req.params.id, req.body);
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }
    broadcastUpdate("table_updated", table);
    res.json(table);
  });

  app.delete("/api/tables/:id", async (req, res) => {
    const success = await storage.deleteTable(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Table not found" });
    }
    broadcastUpdate("table_deleted", { id: req.params.id });
    res.json({ success: true });
  });

  app.patch("/api/tables/:id/status", async (req, res) => {
    const { status } = req.body;
    const table = await storage.updateTableStatus(req.params.id, status);
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }
    broadcastUpdate("table_updated", table);
    res.json(table);
  });

  app.patch("/api/tables/:id/order", async (req, res) => {
    const { orderId } = req.body;
    const table = await storage.updateTableOrder(req.params.id, orderId);
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }
    broadcastUpdate("table_updated", table);
    res.json(table);
  });

  app.get("/api/menu", async (req, res) => {
    const items = await storage.getMenuItems();
    res.json(items);
  });

  app.get("/api/menu/:id", async (req, res) => {
    const item = await storage.getMenuItem(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    res.json(item);
  });

  app.post("/api/menu", async (req, res) => {
    const result = insertMenuItemSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const item = await storage.createMenuItem(result.data);
    broadcastUpdate("menu_updated", item);
    res.json(item);
  });

  app.patch("/api/menu/:id", async (req, res) => {
    const item = await storage.updateMenuItem(req.params.id, req.body);
    if (!item) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    broadcastUpdate("menu_updated", item);
    res.json(item);
  });

  app.delete("/api/menu/:id", async (req, res) => {
    const success = await storage.deleteMenuItem(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    broadcastUpdate("menu_deleted", { id: req.params.id });
    res.json({ success: true });
  });

  app.get("/api/orders", async (req, res) => {
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.get("/api/orders/active", async (req, res) => {
    const orders = await storage.getActiveOrders();
    res.json(orders);
  });

  app.get("/api/orders/completed", async (req, res) => {
    const orders = await storage.getCompletedOrders();
    res.json(orders);
  });

  app.get("/api/orders/:id", async (req, res) => {
    const order = await storage.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  });

  app.get("/api/orders/:id/items", async (req, res) => {
    const items = await storage.getOrderItems(req.params.id);
    res.json(items);
  });

  app.post("/api/orders", async (req, res) => {
    const result = insertOrderSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const order = await storage.createOrder(result.data);

    if (order.tableId) {
      await storage.updateTableOrder(order.tableId, order.id);
      await storage.updateTableStatus(order.tableId, "occupied");
    }

    broadcastUpdate("order_created", order);
    res.json(order);
  });

  app.post("/api/orders/:id/items", async (req, res) => {
    const result = insertOrderItemSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    console.log('[Server] Creating order item for order:', req.params.id);
    const item = await storage.createOrderItem(result.data);

    const orderItems = await storage.getOrderItems(req.params.id);
    const total = orderItems.reduce((sum, item) => {
      return sum + parseFloat(item.price) * item.quantity;
    }, 0);

    await storage.updateOrderTotal(req.params.id, total.toFixed(2));

    const order = await storage.getOrder(req.params.id);
    if (order && order.tableId) {
      const hasNew = orderItems.some((i) => i.status === "new");
      const hasPreparing = orderItems.some((i) => i.status === "preparing");
      const allReady = orderItems.every((i) => i.status === "ready" || i.status === "served");
      const allServed = orderItems.every((i) => i.status === "served");

      if (allServed) {
        await storage.updateTableStatus(order.tableId, "served");
      } else if (allReady) {
        await storage.updateTableStatus(order.tableId, "ready");
      } else if (hasPreparing) {
        await storage.updateTableStatus(order.tableId, "preparing");
      } else if (hasNew) {
        await storage.updateTableStatus(order.tableId, "occupied");
      }

      const updatedTable = await storage.getTable(order.tableId);
      if (updatedTable) {
        broadcastUpdate("table_updated", updatedTable);
      }
    }

    console.log('[Server] Broadcasting order_item_added for orderId:', req.params.id);
    broadcastUpdate("order_item_added", { orderId: req.params.id, item });
    res.json(item);
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    const { status } = req.body;
    const order = await storage.updateOrderStatus(req.params.id, status);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    broadcastUpdate("order_updated", order);
    res.json(order);
  });

  app.post("/api/orders/:id/complete", async (req, res) => {
    const order = await storage.completeOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.tableId) {
      await storage.updateTableOrder(order.tableId, null);
      await storage.updateTableStatus(order.tableId, "free");
    }

    broadcastUpdate("order_completed", order);
    res.json(order);
  });

  app.post("/api/orders/:id/kot", async (req, res) => {
    const result = orderActionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    console.log('[Server] Sending order to kitchen:', req.params.id);
    const order = await storage.updateOrderStatus(req.params.id, "sent_to_kitchen");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    console.log('[Server] Broadcasting order_updated for KOT, orderId:', order.id, 'status:', order.status);
    broadcastUpdate("order_updated", order);
    res.json({ order, shouldPrint: result.data.print });
  });

  app.post("/api/orders/:id/save", async (req, res) => {
    const result = orderActionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    const order = await storage.updateOrderStatus(req.params.id, "saved");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    broadcastUpdate("order_updated", order);
    res.json({ order, shouldPrint: result.data.print });
  });

  app.post("/api/orders/:id/bill", async (req, res) => {
    const result = orderActionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    const order = await storage.billOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    broadcastUpdate("order_updated", order);
    res.json({ order, shouldPrint: result.data.print });
  });

  app.post("/api/orders/:id/checkout", async (req, res) => {
    const result = checkoutSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    const order = await storage.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderItems = await storage.getOrderItems(req.params.id);
    
    const subtotal = orderItems.reduce((sum, item) => 
      sum + parseFloat(item.price) * item.quantity, 0
    );
    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    if (result.data.splitPayments && result.data.splitPayments.length > 0) {
      const splitSum = result.data.splitPayments.reduce((sum, split) => sum + split.amount, 0);
      const tolerance = 0.01;
      if (Math.abs(splitSum - total) > tolerance) {
        return res.status(400).json({ 
          error: "Split payment amounts must equal the total bill",
          splitSum,
          total 
        });
      }
      for (const split of result.data.splitPayments) {
        if (split.amount <= 0) {
          return res.status(400).json({ error: "Split payment amounts must be positive" });
        }
      }
    }

    const checkedOutOrder = await storage.checkoutOrder(req.params.id, result.data.paymentMode);
    if (!checkedOutOrder) {
      return res.status(500).json({ error: "Failed to checkout order" });
    }

    let tableInfo = null;
    if (checkedOutOrder.tableId) {
      tableInfo = await storage.getTable(checkedOutOrder.tableId);
      await storage.updateTableOrder(checkedOutOrder.tableId, null);
      await storage.updateTableStatus(checkedOutOrder.tableId, "free");
    }

    const invoiceCount = (await storage.getInvoices()).length;
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, '0')}`;

    const invoiceItemsData = orderItems.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: parseFloat(item.price),
      isVeg: item.isVeg,
      notes: item.notes || undefined
    }));

    const invoice = await storage.createInvoice({
      invoiceNumber,
      orderId: checkedOutOrder.id,
      tableNumber: tableInfo?.tableNumber || null,
      floorName: tableInfo?.floorId ? (await storage.getFloor(tableInfo.floorId))?.name || null : null,
      customerName: checkedOutOrder.customerName,
      customerPhone: checkedOutOrder.customerPhone,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      discount: "0",
      total: total.toFixed(2),
      paymentMode: result.data.paymentMode || "cash",
      splitPayments: result.data.splitPayments ? JSON.stringify(result.data.splitPayments) : null,
      status: "Paid",
      items: JSON.stringify(invoiceItemsData),
      notes: null,
    });

    broadcastUpdate("order_paid", checkedOutOrder);
    broadcastUpdate("invoice_created", invoice);
    res.json({ order: checkedOutOrder, invoice, shouldPrint: result.data.print });
  });

  app.patch("/api/order-items/:id/status", async (req, res) => {
    const { status } = req.body;
    const item = await storage.updateOrderItemStatus(req.params.id, status);
    if (!item) {
      return res.status(404).json({ error: "Order item not found" });
    }

    const order = await storage.getOrder(item.orderId);
    if (order && order.tableId) {
      const allItems = await storage.getOrderItems(item.orderId);
      const hasNew = allItems.some((i) => i.status === "new");
      const hasPreparing = allItems.some((i) => i.status === "preparing");
      const allReady = allItems.every((i) => i.status === "ready" || i.status === "served");
      const allServed = allItems.every((i) => i.status === "served");

      let newTableStatus = null;
      if (allServed) {
        newTableStatus = "served";
        await storage.updateTableStatus(order.tableId, "served");
      } else if (allReady) {
        newTableStatus = "ready";
        await storage.updateTableStatus(order.tableId, "ready");
      } else if (hasPreparing) {
        newTableStatus = "preparing";
        await storage.updateTableStatus(order.tableId, "preparing");
      } else if (hasNew) {
        newTableStatus = "occupied";
        await storage.updateTableStatus(order.tableId, "occupied");
      }

      if (newTableStatus) {
        const updatedTable = await storage.getTable(order.tableId);
        if (updatedTable) {
          broadcastUpdate("table_updated", updatedTable);
        }
      }
    }

    broadcastUpdate("order_item_updated", item);
    res.json(item);
  });

  app.delete("/api/order-items/:id", async (req, res) => {
    const item = await storage.getOrderItem(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Order item not found" });
    }

    const success = await storage.deleteOrderItem(req.params.id);
    if (!success) {
      return res.status(500).json({ error: "Failed to delete order item" });
    }

    const orderItems = await storage.getOrderItems(item.orderId);
    const total = orderItems.reduce((sum, orderItem) => {
      return sum + parseFloat(orderItem.price) * orderItem.quantity;
    }, 0);

    await storage.updateOrderTotal(item.orderId, total.toFixed(2));

    broadcastUpdate("order_item_deleted", { id: req.params.id, orderId: item.orderId });
    res.json({ success: true });
  });

  app.get("/api/inventory", async (req, res) => {
    const items = await storage.getInventoryItems();
    res.json(items);
  });

  app.post("/api/inventory", async (req, res) => {
    const result = insertInventoryItemSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const item = await storage.createInventoryItem(result.data);
    res.json(item);
  });

  app.patch("/api/inventory/:id", async (req, res) => {
    const { quantity } = req.body;
    const item = await storage.updateInventoryQuantity(req.params.id, quantity);
    if (!item) {
      return res.status(404).json({ error: "Inventory item not found" });
    }
    res.json(item);
  });

  app.get("/api/invoices", async (req, res) => {
    const invoices = await storage.getInvoices();
    res.json(invoices);
  });

  app.get("/api/invoices/:id", async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.json(invoice);
  });

  app.get("/api/invoices/number/:invoiceNumber", async (req, res) => {
    const invoice = await storage.getInvoiceByNumber(req.params.invoiceNumber);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.json(invoice);
  });

  app.post("/api/invoices", async (req, res) => {
    const result = insertInvoiceSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const invoice = await storage.createInvoice(result.data);
    broadcastUpdate("invoice_created", invoice);
    res.json(invoice);
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    const invoice = await storage.updateInvoice(req.params.id, req.body);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    broadcastUpdate("invoice_updated", invoice);
    res.json(invoice);
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    const success = await storage.deleteInvoice(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    broadcastUpdate("invoice_deleted", { id: req.params.id });
    res.json({ success: true });
  });

  app.get("/api/reservations", async (req, res) => {
    const reservations = await storage.getReservations();
    res.json(reservations);
  });

  app.get("/api/reservations/:id", async (req, res) => {
    const reservation = await storage.getReservation(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }
    res.json(reservation);
  });

  app.get("/api/reservations/table/:tableId", async (req, res) => {
    const reservations = await storage.getReservationsByTable(req.params.tableId);
    res.json(reservations);
  });

  app.post("/api/reservations", async (req, res) => {
    console.log("=== SERVER: CREATE RESERVATION ===");
    console.log("Received body:", req.body);
    console.log("Body type:", typeof req.body);
    console.log("Body keys:", Object.keys(req.body));
    console.log("timeSlot value:", req.body.timeSlot);
    console.log("timeSlot type:", typeof req.body.timeSlot);
    
    const result = insertReservationSchema.safeParse(req.body);
    console.log("Validation result:", result.success);
    
    if (!result.success) {
      console.error("Validation errors:", JSON.stringify(result.error, null, 2));
      return res.status(400).json({ error: result.error });
    }
    
    console.log("Validated data:", result.data);
    
    const existingReservations = await storage.getReservationsByTable(result.data.tableId);
    if (existingReservations.length > 0) {
      return res.status(409).json({ error: "This table already has an active reservation" });
    }
    
    const reservation = await storage.createReservation(result.data);
    console.log("Created reservation:", reservation);
    
    const table = await storage.getTable(reservation.tableId);
    if (table && table.status === "free") {
      const updatedTable = await storage.updateTableStatus(reservation.tableId, "reserved");
      if (updatedTable) {
        broadcastUpdate("table_updated", updatedTable);
      }
    }
    broadcastUpdate("reservation_created", reservation);
    res.json(reservation);
  });

  app.patch("/api/reservations/:id", async (req, res) => {
    const existingReservation = await storage.getReservation(req.params.id);
    if (!existingReservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }
    
    const oldTableId = existingReservation.tableId;
    const newTableId = req.body.tableId || oldTableId;
    const tableChanged = oldTableId !== newTableId;
    
    if (tableChanged) {
      const newTableReservations = await storage.getReservationsByTable(newTableId);
      if (newTableReservations.length > 0) {
        return res.status(409).json({ error: "The destination table already has an active reservation" });
      }
    }
    
    const reservation = await storage.updateReservation(req.params.id, req.body);
    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }
    
    if (tableChanged) {
      const oldTableReservations = await storage.getReservationsByTable(oldTableId);
      if (oldTableReservations.length === 0) {
        const oldTable = await storage.getTable(oldTableId);
        if (oldTable && oldTable.status === "reserved" && !oldTable.currentOrderId) {
          const updatedOldTable = await storage.updateTableStatus(oldTableId, "free");
          if (updatedOldTable) {
            broadcastUpdate("table_updated", updatedOldTable);
          }
        }
      }
      
      const newTable = await storage.getTable(newTableId);
      if (newTable && newTable.status === "free") {
        const updatedNewTable = await storage.updateTableStatus(newTableId, "reserved");
        if (updatedNewTable) {
          broadcastUpdate("table_updated", updatedNewTable);
        }
      }
    }
    
    if (req.body.status === "cancelled") {
      const tableReservations = await storage.getReservationsByTable(reservation.tableId);
      if (tableReservations.length === 0) {
        const table = await storage.getTable(reservation.tableId);
        if (table && table.status === "reserved" && !table.currentOrderId) {
          const updatedTable = await storage.updateTableStatus(reservation.tableId, "free");
          if (updatedTable) {
            broadcastUpdate("table_updated", updatedTable);
          }
        }
      }
    }
    
    broadcastUpdate("reservation_updated", reservation);
    res.json(reservation);
  });

  app.delete("/api/reservations/:id", async (req, res) => {
    const reservation = await storage.getReservation(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }
    const success = await storage.deleteReservation(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Failed to delete reservation" });
    }
    const tableReservations = await storage.getReservationsByTable(reservation.tableId);
    if (tableReservations.length === 0) {
      const table = await storage.getTable(reservation.tableId);
      if (table && table.status === "reserved" && !table.currentOrderId) {
        const updatedTable = await storage.updateTableStatus(reservation.tableId, "free");
        if (updatedTable) {
          broadcastUpdate("table_updated", updatedTable);
        }
      }
    }
    broadcastUpdate("reservation_deleted", { id: req.params.id });
    res.json({ success: true });
  });

  app.get("/api/settings/mongodb-uri", async (req, res) => {
    const uri = await storage.getSetting("mongodb_uri");
    res.json({ uri: uri || null, hasUri: !!uri });
  });

  app.post("/api/settings/mongodb-uri", async (req, res) => {
    const { uri } = req.body;
    if (!uri || typeof uri !== "string") {
      return res.status(400).json({ error: "MongoDB URI is required" });
    }
    await storage.setSetting("mongodb_uri", uri);
    res.json({ success: true });
  });

  app.post("/api/menu/sync-from-mongodb", async (req, res) => {
    try {
      const mongoUri = await storage.getSetting("mongodb_uri");
      if (!mongoUri) {
        return res.status(400).json({ error: "MongoDB URI not configured. Please set it first." });
      }

      const { databaseName } = req.body;
      const items = await fetchMenuItemsFromMongoDB(mongoUri, databaseName);
      
      const existingItems = await storage.getMenuItems();
      for (const existing of existingItems) {
        await storage.deleteMenuItem(existing.id);
      }
      
      const createdItems = [];
      for (const item of items) {
        const created = await storage.createMenuItem(item);
        createdItems.push(created);
      }
      
      broadcastUpdate("menu_synced", { count: createdItems.length });
      
      res.json({ 
        success: true, 
        itemsImported: createdItems.length,
        items: createdItems 
      });
    } catch (error) {
      console.error("Error syncing from MongoDB:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to sync from MongoDB" 
      });
    }
  });

  const httpServer = createServer(app);

  wss = new WebSocketServer({ server: httpServer, path: "/api/ws" });

  wss.on("connection", (ws) => {
    ws.on("error", console.error);
  });

  return httpServer;
}
