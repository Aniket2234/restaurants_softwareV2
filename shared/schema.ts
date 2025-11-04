import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const floors = pgTable("floors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertFloorSchema = createInsertSchema(floors).omit({ id: true, createdAt: true });
export type InsertFloor = z.infer<typeof insertFloorSchema>;
export type Floor = typeof floors.$inferSelect;

export const tables = pgTable("tables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tableNumber: text("table_number").notNull().unique(),
  seats: integer("seats").notNull(),
  status: text("status").notNull().default("free"),
  currentOrderId: varchar("current_order_id"),
  floorId: varchar("floor_id"),
});

export const insertTableSchema = createInsertSchema(tables).omit({ id: true, currentOrderId: true });
export type InsertTable = z.infer<typeof insertTableSchema>;
export type Table = typeof tables.$inferSelect;

export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  available: boolean("available").notNull().default(true),
  isVeg: boolean("is_veg").notNull().default(true),
  variants: text("variants").array(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tableId: varchar("table_id"),
  orderType: text("order_type").notNull(),
  status: text("status").notNull().default("saved"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  waiterId: varchar("waiter_id"),
  deliveryPersonId: varchar("delivery_person_id"),
  expectedPickupTime: timestamp("expected_pickup_time"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  completedAt: timestamp("completed_at"),
  billedAt: timestamp("billed_at"),
  paidAt: timestamp("paid_at"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ 
  id: true, 
  createdAt: true, 
  completedAt: true,
  billedAt: true,
  paidAt: true
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  menuItemId: varchar("menu_item_id").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("new"),
  isVeg: boolean("is_veg").notNull().default(true),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  minQuantity: decimal("min_quantity", { precision: 10, scale: 2 }),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true });
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
