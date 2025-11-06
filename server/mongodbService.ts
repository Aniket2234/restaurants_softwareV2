import { MongoClient } from "mongodb";
import type { InsertMenuItem } from "@shared/schema";

export interface MongoDBItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  isVeg: boolean;
  restaurantId?: string;
  isAvailable?: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  restaurantName?: string;
}

export async function fetchMenuItemsFromMongoDB(mongoUri: string, databaseName?: string): Promise<InsertMenuItem[]> {
  let client: MongoClient | null = null;
  
  try {
    let dbName: string;
    
    if (databaseName) {
      dbName = databaseName;
    } else {
      dbName = extractDatabaseName(mongoUri);
    }
    
    client = new MongoClient(mongoUri);
    await client.connect();
    
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    
    const allItems: InsertMenuItem[] = [];
    
    for (const collection of collections) {
      const collectionName = collection.name;
      
      if (collectionName === "system.indexes" || collectionName.startsWith("system.")) {
        continue;
      }
      
      const coll = db.collection(collectionName);
      const items = await coll.find<MongoDBItem>({}).toArray();
      
      for (const item of items) {
        const menuItem: InsertMenuItem = {
          name: item.name,
          category: item.category || collectionName,
          price: item.price?.toString() || "0",
          cost: (item.price ? (item.price * 0.4).toFixed(2) : "0"),
          available: item.isAvailable !== undefined ? item.isAvailable : true,
          isVeg: item.isVeg !== undefined ? item.isVeg : true,
          variants: null,
          image: item.restaurantName || null,
          description: item.description || null,
        };
        
        allItems.push(menuItem);
      }
    }
    
    return allItems;
  } catch (error) {
    console.error("Error fetching from MongoDB:", error);
    throw new Error(`Failed to fetch menu items from MongoDB: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

function extractDatabaseName(mongoUri: string): string {
  const appNameMatch = mongoUri.match(/appName=([^&]+)/i);
  if (appNameMatch && appNameMatch[1]) {
    return appNameMatch[1].toLowerCase();
  }
  
  const pathMatch = mongoUri.match(/mongodb(?:\+srv)?:\/\/[^\/]+\/([^?&]+)/);
  if (pathMatch && pathMatch[1] && pathMatch[1] !== '') {
    return pathMatch[1];
  }
  
  return "test";
}
