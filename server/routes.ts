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
} from "@shared/schema";
import { z } from "zod";

const orderActionSchema = z.object({
  print: z.boolean().optional().default(false),
});

const checkoutSchema = z.object({
  paymentMode: z.string().optional(),
  print: z.boolean().optional().default(false),
});

let wss: WebSocketServer;

function broadcastUpdate(type: string, data: any) {
  if (!wss) return;
  const message = JSON.stringify({ type, data });
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
    const item = await storage.createOrderItem(result.data);

    const orderItems = await storage.getOrderItems(req.params.id);
    const total = orderItems.reduce((sum, item) => {
      return sum + parseFloat(item.price) * item.quantity;
    }, 0);

    await storage.updateOrderTotal(req.params.id, total.toFixed(2));

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
    
    const order = await storage.updateOrderStatus(req.params.id, "sent_to_kitchen");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
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
    
    const order = await storage.checkoutOrder(req.params.id, result.data.paymentMode);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.tableId) {
      await storage.updateTableOrder(order.tableId, null);
      await storage.updateTableStatus(order.tableId, "free");
    }

    broadcastUpdate("order_paid", order);
    res.json({ order, shouldPrint: result.data.print });
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
      const allPreparing = allItems.every((i) => i.status === "preparing" || i.status === "ready");
      const allReady = allItems.every((i) => i.status === "ready" || i.status === "served");
      const allServed = allItems.every((i) => i.status === "served");

      let newTableStatus = null;
      if (allServed) {
        newTableStatus = "served";
        await storage.updateTableStatus(order.tableId, "served");
      } else if (allReady) {
        newTableStatus = "ready";
        await storage.updateTableStatus(order.tableId, "ready");
      } else if (allPreparing) {
        newTableStatus = "preparing";
        await storage.updateTableStatus(order.tableId, "preparing");
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

  const httpServer = createServer(app);

  wss = new WebSocketServer({ server: httpServer, path: "/api/ws" });

  wss.on("connection", (ws) => {
    ws.on("error", console.error);
  });

  return httpServer;
}
