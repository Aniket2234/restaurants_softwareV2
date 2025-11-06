import { z } from "zod";

// User types
export interface User {
  id: string;
  username: string;
  password: string;
}

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// Floor types
export interface Floor {
  id: string;
  name: string;
  displayOrder: number;
  createdAt: Date;
}

export const insertFloorSchema = z.object({
  name: z.string(),
  displayOrder: z.number().default(0),
});

export type InsertFloor = z.infer<typeof insertFloorSchema>;

// Table types
export interface Table {
  id: string;
  tableNumber: string;
  seats: number;
  status: string;
  currentOrderId: string | null;
  floorId: string | null;
}

export const insertTableSchema = z.object({
  tableNumber: z.string(),
  seats: z.number(),
  status: z.string().default("free"),
  floorId: z.string().nullable().optional(),
});

export type InsertTable = z.infer<typeof insertTableSchema>;

// MenuItem types
export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: string;
  cost: string;
  available: boolean;
  isVeg: boolean;
  variants: string[] | null;
  image: string | null;
  description: string | null;
}

export const insertMenuItemSchema = z.object({
  name: z.string(),
  category: z.string(),
  price: z.string(),
  cost: z.string(),
  available: z.boolean().default(true),
  isVeg: z.boolean().default(true),
  variants: z.array(z.string()).nullable().optional(),
  image: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

// Order types
export interface Order {
  id: string;
  tableId: string | null;
  orderType: string;
  status: string;
  total: string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  paymentMode: string | null;
  waiterId: string | null;
  deliveryPersonId: string | null;
  expectedPickupTime: Date | null;
  createdAt: Date;
  completedAt: Date | null;
  billedAt: Date | null;
  paidAt: Date | null;
}

export const insertOrderSchema = z.object({
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
  expectedPickupTime: z.coerce.date().nullable().optional(),
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;

// OrderItem types
export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: string;
  notes: string | null;
  status: string;
  isVeg: boolean;
}

export const insertOrderItemSchema = z.object({
  orderId: z.string(),
  menuItemId: z.string(),
  name: z.string(),
  quantity: z.number(),
  price: z.string(),
  notes: z.string().nullable().optional(),
  status: z.string().default("new"),
  isVeg: z.boolean().default(true),
});

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

// InventoryItem types
export interface InventoryItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  minQuantity: string | null;
}

export const insertInventoryItemSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  unit: z.string(),
  minQuantity: z.string().nullable().optional(),
});

export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

// Invoice types
export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  tableNumber: string | null;
  floorName: string | null;
  customerName: string | null;
  customerPhone: string | null;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  paymentMode: string;
  splitPayments: string | null;
  status: string;
  items: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const insertInvoiceSchema = z.object({
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
  notes: z.string().nullable().optional(),
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

// Reservation types
export interface Reservation {
  id: string;
  tableId: string;
  customerName: string;
  customerPhone: string;
  numberOfPeople: number;
  timeSlot: Date;
  notes: string | null;
  status: string;
  createdAt: Date;
}

export const insertReservationSchema = z.object({
  tableId: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  numberOfPeople: z.number(),
  timeSlot: z.coerce.date(),
  notes: z.string().nullable().optional(),
  status: z.string().default("active"),
});

export type InsertReservation = z.infer<typeof insertReservationSchema>;

// Customer types
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  createdAt: Date;
}

export const insertCustomerSchema = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
