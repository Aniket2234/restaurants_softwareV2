// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// server/mongodb.ts
import { MongoClient } from "mongodb";
var MongoDBService = class {
  client = null;
  db = null;
  async connect() {
    if (this.client && this.db) {
      return;
    }
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    try {
      this.client = new MongoClient(uri);
      await this.client.connect();
      const dbName = this.extractDatabaseName(uri);
      this.db = this.client.db(dbName);
      console.log(`\u2705 Connected to MongoDB database: ${dbName}`);
    } catch (error) {
      console.error("\u274C MongoDB connection error:", error);
      throw error;
    }
  }
  extractDatabaseName(uri) {
    try {
      const url = new URL(uri);
      const pathname = url.pathname.substring(1);
      if (pathname && pathname !== "") {
        return pathname.split("?")[0];
      }
      return "restaurant_pos";
    } catch (error) {
      return "restaurant_pos";
    }
  }
  getDatabase() {
    if (!this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.db;
  }
  getCollection(name) {
    return this.getDatabase().collection(name);
  }
  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log("Disconnected from MongoDB");
    }
  }
};
var mongodb = new MongoDBService();

// server/mongo-storage.ts
import { randomUUID } from "crypto";
var MongoStorage = class {
  async ensureConnection() {
    await mongodb.connect();
  }
  async getUser(id) {
    await this.ensureConnection();
    const user = await mongodb.getCollection("users").findOne({ id });
    return user ?? void 0;
  }
  async getUserByUsername(username) {
    await this.ensureConnection();
    const user = await mongodb.getCollection("users").findOne({ username });
    return user ?? void 0;
  }
  async createUser(user) {
    await this.ensureConnection();
    const id = randomUUID();
    const newUser = { id, ...user };
    await mongodb.getCollection("users").insertOne(newUser);
    return newUser;
  }
  async getFloors() {
    await this.ensureConnection();
    const floors = await mongodb.getCollection("floors").find().sort({ displayOrder: 1 }).toArray();
    return floors;
  }
  async getFloor(id) {
    await this.ensureConnection();
    const floor = await mongodb.getCollection("floors").findOne({ id });
    return floor ?? void 0;
  }
  async createFloor(insertFloor) {
    await this.ensureConnection();
    const id = randomUUID();
    const floor = {
      id,
      name: insertFloor.name,
      displayOrder: insertFloor.displayOrder ?? 0,
      createdAt: /* @__PURE__ */ new Date()
    };
    await mongodb.getCollection("floors").insertOne(floor);
    return floor;
  }
  async updateFloor(id, floorData) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("floors").findOneAndUpdate(
      { id },
      { $set: floorData },
      { returnDocument: "after" }
    );
    return result?.value ?? void 0;
  }
  async deleteFloor(id) {
    await this.ensureConnection();
    const tablesOnFloor = await mongodb.getCollection("tables").countDocuments({ floorId: id });
    if (tablesOnFloor > 0) {
      throw new Error(`Cannot delete floor: ${tablesOnFloor} table(s) are assigned to this floor`);
    }
    const result = await mongodb.getCollection("floors").deleteOne({ id });
    return result.deletedCount > 0;
  }
  async getTables() {
    await this.ensureConnection();
    const tables = await mongodb.getCollection("tables").find().toArray();
    return tables;
  }
  async getTable(id) {
    await this.ensureConnection();
    const table = await mongodb.getCollection("tables").findOne({ id });
    return table ?? void 0;
  }
  async getTableByNumber(tableNumber) {
    await this.ensureConnection();
    const table = await mongodb.getCollection("tables").findOne({ tableNumber });
    return table ?? void 0;
  }
  async createTable(insertTable) {
    await this.ensureConnection();
    const id = randomUUID();
    const table = {
      id,
      tableNumber: insertTable.tableNumber,
      seats: insertTable.seats,
      status: insertTable.status ?? "free",
      currentOrderId: null,
      floorId: insertTable.floorId ?? null
    };
    await mongodb.getCollection("tables").insertOne(table);
    return table;
  }
  async updateTable(id, tableData) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("tables").findOneAndUpdate(
      { id },
      { $set: tableData },
      { returnDocument: "after" }
    );
    return result?.value ?? void 0;
  }
  async updateTableStatus(id, status) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("tables").findOneAndUpdate(
      { id },
      { $set: { status } },
      { returnDocument: "after" }
    );
    return result?.value ?? void 0;
  }
  async updateTableOrder(id, orderId) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("tables").findOneAndUpdate(
      { id },
      { $set: { currentOrderId: orderId } },
      { returnDocument: "after" }
    );
    return result?.value ?? void 0;
  }
  async deleteTable(id) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("tables").deleteOne({ id });
    return result.deletedCount > 0;
  }
  async getMenuItems() {
    await this.ensureConnection();
    const items = await mongodb.getCollection("menuItems").find().toArray();
    return items;
  }
  async getMenuItem(id) {
    await this.ensureConnection();
    const item = await mongodb.getCollection("menuItems").findOne({ id });
    return item ?? void 0;
  }
  async createMenuItem(item) {
    await this.ensureConnection();
    const id = randomUUID();
    const menuItem = {
      id,
      name: item.name,
      category: item.category,
      price: item.price,
      cost: item.cost,
      available: item.available ?? true,
      isVeg: item.isVeg ?? true,
      variants: item.variants ?? null,
      image: item.image ?? null,
      description: item.description ?? null
    };
    await mongodb.getCollection("menuItems").insertOne(menuItem);
    return menuItem;
  }
  async updateMenuItem(id, item) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("menuItems").findOneAndUpdate(
      { id },
      { $set: item },
      { returnDocument: "after" }
    );
    return result?.value ?? void 0;
  }
  async deleteMenuItem(id) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("menuItems").deleteOne({ id });
    return result.deletedCount > 0;
  }
  async getOrders() {
    await this.ensureConnection();
    const orders = await mongodb.getCollection("orders").find().toArray();
    return orders;
  }
  async getOrder(id) {
    await this.ensureConnection();
    const order = await mongodb.getCollection("orders").findOne({ id });
    return order ?? void 0;
  }
  async getOrdersByTable(tableId) {
    await this.ensureConnection();
    const orders = await mongodb.getCollection("orders").find({ tableId }).toArray();
    return orders;
  }
  async getActiveOrders() {
    await this.ensureConnection();
    const orders = await mongodb.getCollection("orders").find({
      status: { $in: ["sent_to_kitchen", "ready_to_bill", "billed"] }
    }).toArray();
    return orders;
  }
  async getCompletedOrders() {
    await this.ensureConnection();
    const orders = await mongodb.getCollection("orders").find({
      status: { $in: ["paid", "completed"] }
    }).toArray();
    return orders;
  }
  async createOrder(insertOrder) {
    await this.ensureConnection();
    const id = randomUUID();
    const order = {
      id,
      tableId: insertOrder.tableId ?? null,
      orderType: insertOrder.orderType,
      status: insertOrder.status ?? "saved",
      total: insertOrder.total ?? "0",
      customerName: insertOrder.customerName ?? null,
      customerPhone: insertOrder.customerPhone ?? null,
      customerAddress: insertOrder.customerAddress ?? null,
      paymentMode: insertOrder.paymentMode ?? null,
      waiterId: insertOrder.waiterId ?? null,
      deliveryPersonId: insertOrder.deliveryPersonId ?? null,
      expectedPickupTime: insertOrder.expectedPickupTime ?? null,
      createdAt: /* @__PURE__ */ new Date(),
      completedAt: null,
      billedAt: null,
      paidAt: null
    };
    await mongodb.getCollection("orders").insertOne(order);
    return order;
  }
  async updateOrderStatus(id, status) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("orders").findOneAndUpdate(
      { id },
      { $set: { status } },
      { returnDocument: "after" }
    );
    return result?.value ?? void 0;
  }
  async updateOrderTotal(id, total) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("orders").findOneAndUpdate(
      { id },
      { $set: { total } },
      { returnDocument: "after" }
    );
    return result?.value ?? void 0;
  }
  async completeOrder(id) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("orders").findOneAndUpdate(
      { id },
      { $set: { status: "completed", completedAt: /* @__PURE__ */ new Date() } },
      { returnDocument: "after" }
    );
    return result?.value ?? void 0;
  }
  async billOrder(id) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("orders").findOneAndUpdate(
      { id },
      { $set: { status: "billed", billedAt: /* @__PURE__ */ new Date() } },
      { returnDocument: "after" }
    );
    return result?.value ?? void 0;
  }
  async checkoutOrder(id, paymentMode) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("orders").findOneAndUpdate(
      { id },
      {
        $set: {
          status: "paid",
          paymentMode: paymentMode ?? null,
          paidAt: /* @__PURE__ */ new Date(),
          completedAt: /* @__PURE__ */ new Date()
        }
      },
      { returnDocument: "after" }
    );
    return result?.value ?? void 0;
  }
  async getOrderItems(orderId) {
    await this.ensureConnection();
    const items = await mongodb.getCollection("orderItems").find({ orderId }).toArray();
    return items;
  }
  async getOrderItem(id) {
    await this.ensureConnection();
    const item = await mongodb.getCollection("orderItems").findOne({ id });
    return item ?? void 0;
  }
  async createOrderItem(item) {
    await this.ensureConnection();
    const id = randomUUID();
    const orderItem = {
      id,
      orderId: item.orderId,
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes ?? null,
      status: item.status ?? "new",
      isVeg: item.isVeg ?? true
    };
    await mongodb.getCollection("orderItems").insertOne(orderItem);
    return orderItem;
  }
  async updateOrderItemStatus(id, status) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("orderItems").findOneAndUpdate(
      { id },
      { $set: { status } },
      { returnDocument: "after" }
    );
    return result?.value ?? void 0;
  }
  async deleteOrderItem(id) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("orderItems").deleteOne({ id });
    return result.deletedCount > 0;
  }
  async getInventoryItems() {
    await this.ensureConnection();
    const items = await mongodb.getCollection("inventoryItems").find().toArray();
    return items;
  }
  async getInventoryItem(id) {
    await this.ensureConnection();
    const item = await mongodb.getCollection("inventoryItems").findOne({ id });
    return item ?? void 0;
  }
  async createInventoryItem(item) {
    await this.ensureConnection();
    const id = randomUUID();
    const inventoryItem = {
      id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      minQuantity: item.minQuantity ?? null
    };
    await mongodb.getCollection("inventoryItems").insertOne(inventoryItem);
    return inventoryItem;
  }
  async updateInventoryQuantity(id, quantity) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("inventoryItems").findOneAndUpdate(
      { id },
      { $set: { quantity } },
      { returnDocument: "after" }
    );
    return result?.value ?? void 0;
  }
  async getInvoices() {
    await this.ensureConnection();
    const invoices = await mongodb.getCollection("invoices").find().sort({ createdAt: -1 }).toArray();
    return invoices;
  }
  async getInvoice(id) {
    await this.ensureConnection();
    const invoice = await mongodb.getCollection("invoices").findOne({ id });
    return invoice ?? void 0;
  }
  async getInvoiceByNumber(invoiceNumber) {
    await this.ensureConnection();
    const invoice = await mongodb.getCollection("invoices").findOne({ invoiceNumber });
    return invoice ?? void 0;
  }
  async createInvoice(insertInvoice) {
    await this.ensureConnection();
    const id = randomUUID();
    const invoice = {
      id,
      invoiceNumber: insertInvoice.invoiceNumber,
      orderId: insertInvoice.orderId,
      tableNumber: insertInvoice.tableNumber ?? null,
      floorName: insertInvoice.floorName ?? null,
      customerName: insertInvoice.customerName ?? null,
      customerPhone: insertInvoice.customerPhone ?? null,
      subtotal: insertInvoice.subtotal,
      tax: insertInvoice.tax,
      discount: insertInvoice.discount ?? "0",
      total: insertInvoice.total,
      paymentMode: insertInvoice.paymentMode,
      splitPayments: insertInvoice.splitPayments ?? null,
      status: insertInvoice.status ?? "Paid",
      items: insertInvoice.items,
      notes: insertInvoice.notes ?? null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    await mongodb.getCollection("invoices").insertOne(invoice);
    return invoice;
  }
  async updateInvoice(id, invoiceData) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("invoices").findOneAndUpdate(
      { id },
      { $set: { ...invoiceData, updatedAt: /* @__PURE__ */ new Date() } },
      { returnDocument: "after" }
    );
    return result?.value ?? void 0;
  }
  async deleteInvoice(id) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("invoices").deleteOne({ id });
    return result.deletedCount > 0;
  }
  async getReservations() {
    await this.ensureConnection();
    const reservations = await mongodb.getCollection("reservations").find().sort({ timeSlot: 1 }).toArray();
    return reservations;
  }
  async getReservation(id) {
    await this.ensureConnection();
    const reservation = await mongodb.getCollection("reservations").findOne({ id });
    return reservation ?? void 0;
  }
  async getReservationsByTable(tableId) {
    await this.ensureConnection();
    const reservations = await mongodb.getCollection("reservations").find({
      tableId,
      status: "active"
    }).toArray();
    return reservations;
  }
  async createReservation(insertReservation) {
    await this.ensureConnection();
    const id = randomUUID();
    const reservation = {
      id,
      tableId: insertReservation.tableId,
      customerName: insertReservation.customerName,
      customerPhone: insertReservation.customerPhone,
      numberOfPeople: insertReservation.numberOfPeople,
      timeSlot: insertReservation.timeSlot,
      notes: insertReservation.notes ?? null,
      status: insertReservation.status ?? "active",
      createdAt: /* @__PURE__ */ new Date()
    };
    await mongodb.getCollection("reservations").insertOne(reservation);
    return reservation;
  }
  async updateReservation(id, reservationData) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("reservations").findOneAndUpdate(
      { id },
      { $set: reservationData },
      { returnDocument: "after" }
    );
    return result?.value ?? void 0;
  }
  async deleteReservation(id) {
    await this.ensureConnection();
    const result = await mongodb.getCollection("reservations").deleteOne({ id });
    return result.deletedCount > 0;
  }
  async getSetting(key) {
    await this.ensureConnection();
    const setting = await mongodb.getCollection("settings").findOne({ key });
    return setting?.value;
  }
  async setSetting(key, value) {
    await this.ensureConnection();
    await mongodb.getCollection("settings").updateOne(
      { key },
      { $set: { key, value } },
      { upsert: true }
    );
  }
};

// server/storage.ts
async function initializeStorage() {
  const storage2 = new MongoStorage();
  const floors = await storage2.getFloors();
  if (floors.length === 0) {
    console.log("\u{1F331} Seeding initial data...");
    const defaultFloor = await storage2.createFloor({
      name: "Ground Floor",
      displayOrder: 0
    });
    const tableNumbers = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
    const seats = [4, 6, 4, 2, 8, 4, 2, 6, 4, 4, 2, 4];
    for (let i = 0; i < tableNumbers.length; i++) {
      await storage2.createTable({
        tableNumber: tableNumbers[i],
        seats: seats[i],
        status: "free",
        floorId: defaultFloor.id
      });
    }
    const menuData = [
      { name: "Chicken Burger", category: "Burgers", price: "199.00", cost: "80.00", available: true, isVeg: false, variants: ["Regular", "Large"] },
      { name: "Veggie Pizza", category: "Pizza", price: "299.00", cost: "120.00", available: true, isVeg: true, variants: null },
      { name: "French Fries", category: "Fast Food", price: "99.00", cost: "35.00", available: true, isVeg: true, variants: ["Small", "Medium", "Large"] },
      { name: "Coca Cola", category: "Beverages", price: "50.00", cost: "20.00", available: true, isVeg: true, variants: null },
      { name: "Caesar Salad", category: "Salads", price: "149.00", cost: "60.00", available: true, isVeg: true, variants: null },
      { name: "Pasta Alfredo", category: "Pasta", price: "249.00", cost: "100.00", available: true, isVeg: true, variants: null },
      { name: "Chocolate Cake", category: "Desserts", price: "129.00", cost: "50.00", available: true, isVeg: true, variants: null },
      { name: "Ice Cream", category: "Desserts", price: "79.00", cost: "30.00", available: true, isVeg: true, variants: ["Vanilla", "Chocolate", "Strawberry"] }
    ];
    for (const item of menuData) {
      await storage2.createMenuItem({
        ...item,
        image: null,
        description: null
      });
    }
    console.log("\u2705 Initial data seeded successfully");
  }
  return storage2;
}
var storagePromise = initializeStorage();
var storage = new MongoStorage();

// shared/schema.ts
import { z } from "zod";
var insertUserSchema = z.object({
  username: z.string(),
  password: z.string()
});
var insertFloorSchema = z.object({
  name: z.string(),
  displayOrder: z.number().default(0)
});
var insertTableSchema = z.object({
  tableNumber: z.string(),
  seats: z.number(),
  status: z.string().default("free"),
  floorId: z.string().nullable().optional()
});
var insertMenuItemSchema = z.object({
  name: z.string(),
  category: z.string(),
  price: z.string(),
  cost: z.string(),
  available: z.boolean().default(true),
  isVeg: z.boolean().default(true),
  variants: z.array(z.string()).nullable().optional(),
  image: z.string().nullable().optional(),
  description: z.string().nullable().optional()
});
var insertOrderSchema = z.object({
  tableId: z.string().nullable().optional(),
  orderType: z.string(),
  status: z.string().default("saved"),
  total: z.string().default("0"),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  customerAddress: z.string().nullable().optional(),
  paymentMode: z.string().nullable().optional(),
  waiterId: z.string().nullable().optional(),
  deliveryPersonId: z.string().nullable().optional(),
  expectedPickupTime: z.coerce.date().nullable().optional()
});
var insertOrderItemSchema = z.object({
  orderId: z.string(),
  menuItemId: z.string(),
  name: z.string(),
  quantity: z.number(),
  price: z.string(),
  notes: z.string().nullable().optional(),
  status: z.string().default("new"),
  isVeg: z.boolean().default(true)
});
var insertInventoryItemSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  unit: z.string(),
  minQuantity: z.string().nullable().optional()
});
var insertInvoiceSchema = z.object({
  invoiceNumber: z.string(),
  orderId: z.string(),
  tableNumber: z.string().nullable().optional(),
  floorName: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  subtotal: z.string(),
  tax: z.string(),
  discount: z.string().default("0"),
  total: z.string(),
  paymentMode: z.string(),
  splitPayments: z.string().nullable().optional(),
  status: z.string().default("Paid"),
  items: z.string(),
  notes: z.string().nullable().optional()
});
var insertReservationSchema = z.object({
  tableId: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  numberOfPeople: z.number(),
  timeSlot: z.coerce.date(),
  notes: z.string().nullable().optional(),
  status: z.string().default("active")
});

// server/routes.ts
import { z as z2 } from "zod";

// server/mongodbService.ts
import { MongoClient as MongoClient2 } from "mongodb";
async function fetchMenuItemsFromMongoDB(mongoUri, databaseName) {
  let client = null;
  try {
    let dbName;
    if (databaseName) {
      dbName = databaseName;
    } else {
      dbName = extractDatabaseName(mongoUri);
    }
    client = new MongoClient2(mongoUri);
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    const allItems = [];
    const categorySet = /* @__PURE__ */ new Set();
    for (const collection of collections) {
      const collectionName = collection.name;
      if (collectionName === "system.indexes" || collectionName.startsWith("system.")) {
        continue;
      }
      const coll = db.collection(collectionName);
      const items = await coll.find({}).toArray();
      for (const item of items) {
        const category = item.category || collectionName;
        categorySet.add(category);
        const menuItem = {
          name: item.name,
          category,
          price: item.price?.toString() || "0",
          cost: item.price ? (item.price * 0.4).toFixed(2) : "0",
          available: item.isAvailable !== void 0 ? item.isAvailable : true,
          isVeg: item.isVeg !== void 0 ? item.isVeg : true,
          variants: null,
          image: item.image || null,
          description: item.description || null
        };
        allItems.push(menuItem);
      }
    }
    return {
      items: allItems,
      categories: Array.from(categorySet).sort()
    };
  } catch (error) {
    console.error("Error fetching from MongoDB:", error);
    throw new Error(`Failed to fetch menu items from MongoDB: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (client) {
      await client.close();
    }
  }
}
function extractDatabaseName(mongoUri) {
  const appNameMatch = mongoUri.match(/appName=([^&]+)/i);
  if (appNameMatch && appNameMatch[1]) {
    return appNameMatch[1].toLowerCase();
  }
  const pathMatch = mongoUri.match(/mongodb(?:\+srv)?:\/\/[^\/]+\/([^?&]+)/);
  if (pathMatch && pathMatch[1] && pathMatch[1] !== "") {
    return pathMatch[1];
  }
  return "test";
}

// server/routes.ts
var orderActionSchema = z2.object({
  print: z2.boolean().optional().default(false)
});
var checkoutSchema = z2.object({
  paymentMode: z2.string().optional(),
  print: z2.boolean().optional().default(false),
  splitPayments: z2.array(z2.object({
    person: z2.number(),
    amount: z2.number(),
    paymentMode: z2.string()
  })).optional()
});
var wss;
function broadcastUpdate(type, data) {
  if (!wss) {
    console.log("[WebSocket] No WSS instance, cannot broadcast");
    return;
  }
  const message = JSON.stringify({ type, data });
  const clientCount = Array.from(wss.clients).filter((c) => c.readyState === WebSocket.OPEN).length;
  console.log(`[WebSocket] Broadcasting ${type} to ${clientCount} clients`);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
async function registerRoutes(app2) {
  app2.get("/api/floors", async (req, res) => {
    const floors = await storage.getFloors();
    res.json(floors);
  });
  app2.get("/api/floors/:id", async (req, res) => {
    const floor = await storage.getFloor(req.params.id);
    if (!floor) {
      return res.status(404).json({ error: "Floor not found" });
    }
    res.json(floor);
  });
  app2.post("/api/floors", async (req, res) => {
    const result = insertFloorSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const floor = await storage.createFloor(result.data);
    broadcastUpdate("floor_created", floor);
    res.json(floor);
  });
  app2.patch("/api/floors/:id", async (req, res) => {
    const floor = await storage.updateFloor(req.params.id, req.body);
    if (!floor) {
      return res.status(404).json({ error: "Floor not found" });
    }
    broadcastUpdate("floor_updated", floor);
    res.json(floor);
  });
  app2.delete("/api/floors/:id", async (req, res) => {
    const success = await storage.deleteFloor(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Floor not found" });
    }
    broadcastUpdate("floor_deleted", { id: req.params.id });
    res.json({ success: true });
  });
  app2.get("/api/tables", async (req, res) => {
    const tables = await storage.getTables();
    res.json(tables);
  });
  app2.get("/api/tables/:id", async (req, res) => {
    const table = await storage.getTable(req.params.id);
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }
    res.json(table);
  });
  app2.post("/api/tables", async (req, res) => {
    const result = insertTableSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const table = await storage.createTable(result.data);
    broadcastUpdate("table_created", table);
    res.json(table);
  });
  app2.patch("/api/tables/:id", async (req, res) => {
    const table = await storage.updateTable(req.params.id, req.body);
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }
    broadcastUpdate("table_updated", table);
    res.json(table);
  });
  app2.delete("/api/tables/:id", async (req, res) => {
    const success = await storage.deleteTable(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Table not found" });
    }
    broadcastUpdate("table_deleted", { id: req.params.id });
    res.json({ success: true });
  });
  app2.patch("/api/tables/:id/status", async (req, res) => {
    const { status } = req.body;
    const table = await storage.updateTableStatus(req.params.id, status);
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }
    broadcastUpdate("table_updated", table);
    res.json(table);
  });
  app2.patch("/api/tables/:id/order", async (req, res) => {
    const { orderId } = req.body;
    const table = await storage.updateTableOrder(req.params.id, orderId);
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }
    broadcastUpdate("table_updated", table);
    res.json(table);
  });
  app2.get("/api/menu", async (req, res) => {
    const items = await storage.getMenuItems();
    res.json(items);
  });
  app2.get("/api/menu/categories", async (req, res) => {
    const categoriesJson = await storage.getSetting("menu_categories");
    const categories = categoriesJson ? JSON.parse(categoriesJson) : [];
    res.json({ categories });
  });
  app2.get("/api/menu/:id", async (req, res) => {
    const item = await storage.getMenuItem(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    res.json(item);
  });
  app2.post("/api/menu", async (req, res) => {
    const result = insertMenuItemSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const item = await storage.createMenuItem(result.data);
    broadcastUpdate("menu_updated", item);
    res.json(item);
  });
  app2.patch("/api/menu/:id", async (req, res) => {
    const item = await storage.updateMenuItem(req.params.id, req.body);
    if (!item) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    broadcastUpdate("menu_updated", item);
    res.json(item);
  });
  app2.delete("/api/menu/:id", async (req, res) => {
    const success = await storage.deleteMenuItem(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    broadcastUpdate("menu_deleted", { id: req.params.id });
    res.json({ success: true });
  });
  app2.get("/api/orders", async (req, res) => {
    const orders = await storage.getOrders();
    res.json(orders);
  });
  app2.get("/api/orders/active", async (req, res) => {
    const orders = await storage.getActiveOrders();
    res.json(orders);
  });
  app2.get("/api/orders/completed", async (req, res) => {
    const orders = await storage.getCompletedOrders();
    res.json(orders);
  });
  app2.get("/api/orders/:id", async (req, res) => {
    const order = await storage.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  });
  app2.get("/api/orders/:id/items", async (req, res) => {
    const items = await storage.getOrderItems(req.params.id);
    res.json(items);
  });
  app2.post("/api/orders", async (req, res) => {
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
  app2.post("/api/orders/:id/items", async (req, res) => {
    const result = insertOrderItemSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    console.log("[Server] Creating order item for order:", req.params.id);
    const item = await storage.createOrderItem(result.data);
    const orderItems = await storage.getOrderItems(req.params.id);
    const total = orderItems.reduce((sum, item2) => {
      return sum + parseFloat(item2.price) * item2.quantity;
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
    console.log("[Server] Broadcasting order_item_added for orderId:", req.params.id);
    broadcastUpdate("order_item_added", { orderId: req.params.id, item });
    res.json(item);
  });
  app2.patch("/api/orders/:id/status", async (req, res) => {
    const { status } = req.body;
    const order = await storage.updateOrderStatus(req.params.id, status);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    broadcastUpdate("order_updated", order);
    res.json(order);
  });
  app2.post("/api/orders/:id/complete", async (req, res) => {
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
  app2.post("/api/orders/:id/kot", async (req, res) => {
    const result = orderActionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    console.log("[Server] Sending order to kitchen:", req.params.id);
    const order = await storage.updateOrderStatus(req.params.id, "sent_to_kitchen");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    console.log("[Server] Broadcasting order_updated for KOT, orderId:", order.id, "status:", order.status);
    broadcastUpdate("order_updated", order);
    res.json({ order, shouldPrint: result.data.print });
  });
  app2.post("/api/orders/:id/save", async (req, res) => {
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
  app2.post("/api/orders/:id/bill", async (req, res) => {
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
  app2.post("/api/orders/:id/checkout", async (req, res) => {
    const result = checkoutSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const order = await storage.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    const orderItems = await storage.getOrderItems(req.params.id);
    const subtotal = orderItems.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
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
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, "0")}`;
    const invoiceItemsData = orderItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: parseFloat(item.price),
      isVeg: item.isVeg,
      notes: item.notes || void 0
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
      notes: null
    });
    broadcastUpdate("order_paid", checkedOutOrder);
    broadcastUpdate("invoice_created", invoice);
    res.json({ order: checkedOutOrder, invoice, shouldPrint: result.data.print });
  });
  app2.patch("/api/order-items/:id/status", async (req, res) => {
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
  app2.delete("/api/order-items/:id", async (req, res) => {
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
  app2.get("/api/inventory", async (req, res) => {
    const items = await storage.getInventoryItems();
    res.json(items);
  });
  app2.post("/api/inventory", async (req, res) => {
    const result = insertInventoryItemSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const item = await storage.createInventoryItem(result.data);
    res.json(item);
  });
  app2.patch("/api/inventory/:id", async (req, res) => {
    const { quantity } = req.body;
    const item = await storage.updateInventoryQuantity(req.params.id, quantity);
    if (!item) {
      return res.status(404).json({ error: "Inventory item not found" });
    }
    res.json(item);
  });
  app2.get("/api/invoices", async (req, res) => {
    const invoices = await storage.getInvoices();
    res.json(invoices);
  });
  app2.get("/api/invoices/:id", async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.json(invoice);
  });
  app2.get("/api/invoices/number/:invoiceNumber", async (req, res) => {
    const invoice = await storage.getInvoiceByNumber(req.params.invoiceNumber);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.json(invoice);
  });
  app2.post("/api/invoices", async (req, res) => {
    const result = insertInvoiceSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const invoice = await storage.createInvoice(result.data);
    broadcastUpdate("invoice_created", invoice);
    res.json(invoice);
  });
  app2.patch("/api/invoices/:id", async (req, res) => {
    const invoice = await storage.updateInvoice(req.params.id, req.body);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    broadcastUpdate("invoice_updated", invoice);
    res.json(invoice);
  });
  app2.delete("/api/invoices/:id", async (req, res) => {
    const success = await storage.deleteInvoice(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    broadcastUpdate("invoice_deleted", { id: req.params.id });
    res.json({ success: true });
  });
  app2.get("/api/reservations", async (req, res) => {
    const reservations = await storage.getReservations();
    res.json(reservations);
  });
  app2.get("/api/reservations/:id", async (req, res) => {
    const reservation = await storage.getReservation(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }
    res.json(reservation);
  });
  app2.get("/api/reservations/table/:tableId", async (req, res) => {
    const reservations = await storage.getReservationsByTable(req.params.tableId);
    res.json(reservations);
  });
  app2.post("/api/reservations", async (req, res) => {
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
  app2.patch("/api/reservations/:id", async (req, res) => {
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
  app2.delete("/api/reservations/:id", async (req, res) => {
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
  app2.get("/api/settings/mongodb-uri", async (req, res) => {
    const uri = await storage.getSetting("mongodb_uri");
    res.json({ uri: uri || null, hasUri: !!uri });
  });
  app2.post("/api/settings/mongodb-uri", async (req, res) => {
    const { uri } = req.body;
    if (!uri || typeof uri !== "string") {
      return res.status(400).json({ error: "MongoDB URI is required" });
    }
    await storage.setSetting("mongodb_uri", uri);
    res.json({ success: true });
  });
  app2.post("/api/menu/sync-from-mongodb", async (req, res) => {
    try {
      const mongoUri = await storage.getSetting("mongodb_uri");
      if (!mongoUri) {
        return res.status(400).json({ error: "MongoDB URI not configured. Please set it first." });
      }
      const { databaseName } = req.body;
      const { items, categories } = await fetchMenuItemsFromMongoDB(mongoUri, databaseName);
      const existingItems = await storage.getMenuItems();
      for (const existing of existingItems) {
        await storage.deleteMenuItem(existing.id);
      }
      const createdItems = [];
      for (const item of items) {
        const created = await storage.createMenuItem(item);
        createdItems.push(created);
      }
      await storage.setSetting("menu_categories", JSON.stringify(categories));
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
  const httpServer = createServer(app2);
  wss = new WebSocketServer({ server: httpServer, path: "/api/ws" });
  wss.on("connection", (ws) => {
    ws.on("error", console.error);
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
