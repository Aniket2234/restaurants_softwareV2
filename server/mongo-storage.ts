import { mongodb } from './mongodb';
import {
  type User,
  type InsertUser,
  type Floor,
  type InsertFloor,
  type Table,
  type InsertTable,
  type MenuItem,
  type InsertMenuItem,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type InventoryItem,
  type InsertInventoryItem,
  type Invoice,
  type InsertInvoice,
  type Reservation,
  type InsertReservation,
} from "@shared/schema";
import { IStorage } from './storage';
import { randomUUID } from 'crypto';

export class MongoStorage implements IStorage {
  private async ensureConnection() {
    await mongodb.connect();
  }

  private stripMongoId<T extends { _id?: any }>(doc: T | null): Omit<T, '_id'> | null {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return rest as Omit<T, '_id'>;
  }

  async getUser(id: string): Promise<User | undefined> {
    await this.ensureConnection();
    const user = await mongodb.getCollection<User>('users').findOne({ id } as any);
    return user ?? undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureConnection();
    const user = await mongodb.getCollection<User>('users').findOne({ username } as any);
    return user ?? undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    await this.ensureConnection();
    const id = randomUUID();
    const newUser: User = { id, ...user };
    await mongodb.getCollection<User>('users').insertOne(newUser as any);
    return newUser;
  }

  async getFloors(): Promise<Floor[]> {
    await this.ensureConnection();
    const floors = await mongodb.getCollection<Floor>('floors').find().sort({ displayOrder: 1 }).toArray();
    return floors;
  }

  async getFloor(id: string): Promise<Floor | undefined> {
    await this.ensureConnection();
    const floor = await mongodb.getCollection<Floor>('floors').findOne({ id } as any);
    return floor ?? undefined;
  }

  async createFloor(insertFloor: InsertFloor): Promise<Floor> {
    await this.ensureConnection();
    const id = randomUUID();
    const floor: Floor = {
      id,
      name: insertFloor.name,
      displayOrder: insertFloor.displayOrder ?? 0,
      createdAt: new Date(),
    };
    await mongodb.getCollection<Floor>('floors').insertOne(floor as any);
    return floor;
  }

  async updateFloor(id: string, floorData: Partial<InsertFloor>): Promise<Floor | undefined> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<Floor>('floors').findOneAndUpdate(
      { id } as any,
      { $set: floorData },
      { returnDocument: 'after' }
    );
    return result ?? undefined;
  }

  async deleteFloor(id: string): Promise<boolean> {
    await this.ensureConnection();
    const tablesOnFloor = await mongodb.getCollection<Table>('tables').countDocuments({ floorId: id } as any);
    if (tablesOnFloor > 0) {
      throw new Error(`Cannot delete floor: ${tablesOnFloor} table(s) are assigned to this floor`);
    }
    const result = await mongodb.getCollection<Floor>('floors').deleteOne({ id } as any);
    return result.deletedCount > 0;
  }

  async getTables(): Promise<Table[]> {
    await this.ensureConnection();
    const tables = await mongodb.getCollection<Table>('tables').find().toArray();
    return tables;
  }

  async getTable(id: string): Promise<Table | undefined> {
    await this.ensureConnection();
    const table = await mongodb.getCollection<Table>('tables').findOne({ id } as any);
    return table ?? undefined;
  }

  async getTableByNumber(tableNumber: string): Promise<Table | undefined> {
    await this.ensureConnection();
    const table = await mongodb.getCollection<Table>('tables').findOne({ tableNumber } as any);
    return table ?? undefined;
  }

  async createTable(insertTable: InsertTable): Promise<Table> {
    await this.ensureConnection();
    const id = randomUUID();
    const table: Table = {
      id,
      tableNumber: insertTable.tableNumber,
      seats: insertTable.seats,
      status: insertTable.status ?? "free",
      currentOrderId: null,
      floorId: insertTable.floorId ?? null,
    };
    await mongodb.getCollection<Table>('tables').insertOne(table as any);
    return table;
  }

  async updateTable(id: string, tableData: Partial<InsertTable>): Promise<Table | undefined> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<Table>('tables').findOneAndUpdate(
      { id } as any,
      { $set: tableData },
      { returnDocument: 'after' }
    );
    return result ?? undefined;
  }

  async updateTableStatus(id: string, status: string): Promise<Table | undefined> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<Table>('tables').findOneAndUpdate(
      { id } as any,
      { $set: { status } },
      { returnDocument: 'after' }
    );
    return result ?? undefined;
  }

  async updateTableOrder(id: string, orderId: string | null): Promise<Table | undefined> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<Table>('tables').findOneAndUpdate(
      { id } as any,
      { $set: { currentOrderId: orderId } },
      { returnDocument: 'after' }
    );
    return result ?? undefined;
  }

  async deleteTable(id: string): Promise<boolean> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<Table>('tables').deleteOne({ id } as any);
    return result.deletedCount > 0;
  }

  async getMenuItems(): Promise<MenuItem[]> {
    await this.ensureConnection();
    const items = await mongodb.getCollection<MenuItem>('menuItems').find().toArray();
    return items;
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    await this.ensureConnection();
    const item = await mongodb.getCollection<MenuItem>('menuItems').findOne({ id } as any);
    return item ?? undefined;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    await this.ensureConnection();
    const id = randomUUID();
    const menuItem: MenuItem = {
      id,
      name: item.name,
      category: item.category,
      price: item.price,
      cost: item.cost,
      available: item.available ?? true,
      isVeg: item.isVeg ?? true,
      variants: item.variants ?? null,
      image: item.image ?? null,
      description: item.description ?? null,
    };
    await mongodb.getCollection<MenuItem>('menuItems').insertOne(menuItem as any);
    return menuItem;
  }

  async updateMenuItem(id: string, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<MenuItem>('menuItems').findOneAndUpdate(
      { id } as any,
      { $set: item },
      { returnDocument: 'after' }
    );
    return result ?? undefined;
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<MenuItem>('menuItems').deleteOne({ id } as any);
    return result.deletedCount > 0;
  }

  async getOrders(): Promise<Order[]> {
    await this.ensureConnection();
    const orders = await mongodb.getCollection<Order>('orders').find().toArray();
    return orders;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    await this.ensureConnection();
    const order = await mongodb.getCollection<Order>('orders').findOne({ id } as any);
    return order ?? undefined;
  }

  async getOrdersByTable(tableId: string): Promise<Order[]> {
    await this.ensureConnection();
    const orders = await mongodb.getCollection<Order>('orders').find({ tableId } as any).toArray();
    return orders;
  }

  async getActiveOrders(): Promise<Order[]> {
    await this.ensureConnection();
    const orders = await mongodb.getCollection<Order>('orders').find({
      status: { $in: ["sent_to_kitchen", "ready_to_bill", "billed"] }
    } as any).toArray();
    return orders;
  }

  async getCompletedOrders(): Promise<Order[]> {
    await this.ensureConnection();
    const orders = await mongodb.getCollection<Order>('orders').find({
      status: { $in: ["paid", "completed"] }
    } as any).toArray();
    return orders;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    await this.ensureConnection();
    const id = randomUUID();
    const order: Order = {
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
      createdAt: new Date(),
      completedAt: null,
      billedAt: null,
      paidAt: null,
    };
    await mongodb.getCollection<Order>('orders').insertOne(order as any);
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<Order>('orders').findOneAndUpdate(
      { id } as any,
      { $set: { status } },
      { returnDocument: 'after' }
    );
    return result ?? undefined;
  }

  async updateOrderTotal(id: string, total: string): Promise<Order | undefined> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<Order>('orders').findOneAndUpdate(
      { id } as any,
      { $set: { total } },
      { returnDocument: 'after' }
    );
    return result ?? undefined;
  }

  async completeOrder(id: string): Promise<Order | undefined> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<Order>('orders').findOneAndUpdate(
      { id } as any,
      { $set: { status: "completed", completedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ?? undefined;
  }

  async billOrder(id: string): Promise<Order | undefined> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<Order>('orders').findOneAndUpdate(
      { id } as any,
      { $set: { status: "billed", billedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ?? undefined;
  }

  async checkoutOrder(id: string, paymentMode?: string): Promise<Order | undefined> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<Order>('orders').findOneAndUpdate(
      { id } as any,
      { 
        $set: { 
          status: "paid", 
          paymentMode: paymentMode ?? null, 
          paidAt: new Date(), 
          completedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    return result ?? undefined;
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    await this.ensureConnection();
    const items = await mongodb.getCollection<OrderItem>('orderItems').find({ orderId } as any).toArray();
    return items;
  }

  async getOrderItem(id: string): Promise<OrderItem | undefined> {
    await this.ensureConnection();
    const item = await mongodb.getCollection<OrderItem>('orderItems').findOne({ id } as any);
    return item ?? undefined;
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    await this.ensureConnection();
    const id = randomUUID();
    const orderItem: OrderItem = {
      id,
      orderId: item.orderId,
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes ?? null,
      status: item.status ?? "new",
      isVeg: item.isVeg ?? true,
    };
    await mongodb.getCollection<OrderItem>('orderItems').insertOne(orderItem as any);
    return orderItem;
  }

  async updateOrderItemStatus(id: string, status: string): Promise<OrderItem | undefined> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<OrderItem>('orderItems').findOneAndUpdate(
      { id } as any,
      { $set: { status } },
      { returnDocument: 'after' }
    );
    return result ?? undefined;
  }

  async deleteOrderItem(id: string): Promise<boolean> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<OrderItem>('orderItems').deleteOne({ id } as any);
    return result.deletedCount > 0;
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    await this.ensureConnection();
    const items = await mongodb.getCollection<InventoryItem>('inventoryItems').find().toArray();
    return items;
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    await this.ensureConnection();
    const item = await mongodb.getCollection<InventoryItem>('inventoryItems').findOne({ id } as any);
    return item ?? undefined;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    await this.ensureConnection();
    const id = randomUUID();
    const inventoryItem: InventoryItem = {
      id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      minQuantity: item.minQuantity ?? null,
    };
    await mongodb.getCollection<InventoryItem>('inventoryItems').insertOne(inventoryItem as any);
    return inventoryItem;
  }

  async updateInventoryQuantity(id: string, quantity: string): Promise<InventoryItem | undefined> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<InventoryItem>('inventoryItems').findOneAndUpdate(
      { id } as any,
      { $set: { quantity } },
      { returnDocument: 'after' }
    );
    return result ?? undefined;
  }

  async getInvoices(): Promise<Invoice[]> {
    await this.ensureConnection();
    const invoices = await mongodb.getCollection<Invoice>('invoices').find().sort({ createdAt: -1 }).toArray();
    return invoices;
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    await this.ensureConnection();
    const invoice = await mongodb.getCollection<Invoice>('invoices').findOne({ id } as any);
    return invoice ?? undefined;
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    await this.ensureConnection();
    const invoice = await mongodb.getCollection<Invoice>('invoices').findOne({ invoiceNumber } as any);
    return invoice ?? undefined;
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    await this.ensureConnection();
    const id = randomUUID();
    const invoice: Invoice = {
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await mongodb.getCollection<Invoice>('invoices').insertOne(invoice as any);
    return invoice;
  }

  async updateInvoice(id: string, invoiceData: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<Invoice>('invoices').findOneAndUpdate(
      { id } as any,
      { $set: { ...invoiceData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ?? undefined;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<Invoice>('invoices').deleteOne({ id } as any);
    return result.deletedCount > 0;
  }

  async getReservations(): Promise<Reservation[]> {
    await this.ensureConnection();
    const reservations = await mongodb.getCollection<Reservation>('reservations').find().sort({ timeSlot: 1 }).toArray();
    return reservations;
  }

  async getReservation(id: string): Promise<Reservation | undefined> {
    await this.ensureConnection();
    const reservation = await mongodb.getCollection<Reservation>('reservations').findOne({ id } as any);
    return reservation ?? undefined;
  }

  async getReservationsByTable(tableId: string): Promise<Reservation[]> {
    await this.ensureConnection();
    const reservations = await mongodb.getCollection<Reservation>('reservations').find({
      tableId,
      status: "active"
    } as any).toArray();
    return reservations;
  }

  async createReservation(insertReservation: InsertReservation): Promise<Reservation> {
    await this.ensureConnection();
    const id = randomUUID();
    const reservation: Reservation = {
      id,
      tableId: insertReservation.tableId,
      customerName: insertReservation.customerName,
      customerPhone: insertReservation.customerPhone,
      numberOfPeople: insertReservation.numberOfPeople,
      timeSlot: insertReservation.timeSlot,
      notes: insertReservation.notes ?? null,
      status: insertReservation.status ?? "active",
      createdAt: new Date(),
    };
    await mongodb.getCollection<Reservation>('reservations').insertOne(reservation as any);
    return reservation;
  }

  async updateReservation(id: string, reservationData: Partial<InsertReservation>): Promise<Reservation | undefined> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<Reservation>('reservations').findOneAndUpdate(
      { id } as any,
      { $set: reservationData },
      { returnDocument: 'after' }
    );
    return result ?? undefined;
  }

  async deleteReservation(id: string): Promise<boolean> {
    await this.ensureConnection();
    const result = await mongodb.getCollection<Reservation>('reservations').deleteOne({ id } as any);
    return result.deletedCount > 0;
  }

  async getSetting(key: string): Promise<string | undefined> {
    await this.ensureConnection();
    const setting = await mongodb.getCollection<{ key: string; value: string }>('settings').findOne({ key } as any);
    return setting?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.ensureConnection();
    await mongodb.getCollection<{ key: string; value: string }>('settings').updateOne(
      { key } as any,
      { $set: { key, value } },
      { upsert: true }
    );
  }
}
