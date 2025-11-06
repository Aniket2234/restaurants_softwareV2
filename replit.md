# Restaurant POS System

## Overview

This is a comprehensive restaurant Point of Sale (POS) and management system built as a full-stack web application. The system aims to match or exceed PetPooja software in functionality, providing a complete solution for restaurant operations including billing, table management, kitchen display, inventory, staff management, reporting, and customer engagement features.

The application is designed as a single-page application (SPA) with no page reloads, featuring a professional, clean, and minimalist design approach with modern UI/UX patterns.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Language**: React with TypeScript, following component-based architecture with strict type safety.

**UI Component System**: Utilizes shadcn/ui components (Radix UI primitives) configured in "new-york" style with a custom design system. The component configuration supports both RSC and client-side rendering patterns.

**Styling Approach**: 
- Tailwind CSS for utility-first styling with custom design tokens
- CSS variables for theming (light/dark mode support built-in)
- Custom color palette defined in design guidelines featuring primary red (#E74C3C), secondary blue (#3498DB), and status colors
- Typography system using Inter, Poppins, and Roboto font families

**State Management**: Hybrid approach using React Context API and Redux Toolkit for complex state. TanStack Query (React Query) handles server state with custom query functions.

**Routing**: Wouter for lightweight client-side routing, supporting the SPA architecture.

**Form Handling**: React Hook Form with Hookform Resolvers for validation, using Yup schemas.

**Data Visualization**: Recharts for charts and analytics dashboards.

**Interactions & Animations**: 
- Framer Motion for smooth animations
- Custom hover/active states using elevation utilities
- Toast notifications for user feedback

### Backend Architecture

**Server Framework**: Express.js with TypeScript running on Node.js.

**API Design**: RESTful API architecture with routes prefixed under `/api`. The route registration system is modular and extensible.

**Database Layer**: 
- Uses MongoDB (v6) for persistent NoSQL data storage
- Direct MongoDB Node.js driver integration (no ORM)
- Connection managed through custom MongoDB service (`server/mongodb.ts`)
- Database-agnostic schema with TypeScript interfaces and Zod validation

**Data Storage Strategy**: MongoDB-based persistent storage:
- `MongoStorage`: Primary storage implementation using MongoDB collections
- All data (tables, orders, menu items, invoices, etc.) persists in MongoDB
- Automatic seed data initialization on first run (creates default floors, tables, menu items)
- Storage interface (`IStorage`) allows future migration to other databases if needed

**Session Management**: Prepared for session handling with connect-pg-simple for PostgreSQL-backed sessions.

**Development Tooling**: 
- Vite for fast development server with HMR
- Replit-specific plugins for enhanced development experience
- Custom error overlays and runtime error handling

### Application Structure

**Page Organization**: Modular page components for each major feature:
- Core Operations: Dashboard, Billing, Tables, Kitchen (KDS)
- Menu & Inventory: Menu management, Inventory, Purchase Orders, Suppliers
- Customer Management: Customers, Loyalty, Reservations, Feedback
- Staff & HR: Staff, Attendance, User Roles
- Financial: Expenses, Payment Settlement, Accounting, Invoices, Tax Reports
- Marketing: Offers, Coupons, Gift Cards, Email Templates
- Analytics: Reports, Sales Analysis, Item Performance, Kitchen Performance
- System: Settings, Multi-location, Audit Logs, Backup, Integrations

**Component Architecture**:
- Reusable UI components (AppHeader, StatCard, TableCard, MenuItemCard, etc.)
- Feature-specific components (KDSOrderCard, OrderCart, CategorySidebar)
- Sidebar navigation with hierarchical menu structure
- Responsive layout with mobile detection hooks

**Design Philosophy**:
- Three-column layout for billing (category sidebar, items grid, order cart)
- Visual layouts for table management with color-coded status
- Kitchen Display System with real-time order tracking
- Single-window application principle - no page reloads
- Material Design principles for data-heavy enterprise UI

### Recent Changes (November 2025)

**Complete MongoDB Migration** (November 6, 2025):
- Migrated entire project from in-memory storage to MongoDB for persistent data storage
- Removed PostgreSQL/Drizzle ORM dependencies (deleted server/db.ts, drizzle.config.ts)
- Created MongoDB connection service with automatic database name extraction from URI
- Updated schema from Drizzle pgTable definitions to pure TypeScript interfaces
- Implemented MongoStorage class with full IStorage interface support for all collections
- Added automatic seed data (floors, tables, menu items) on first database connection
- All CRUD operations now use MongoDB directly through the Node.js driver v6
- Data persists across server restarts using MONGODB_URI environment variable

**MongoDB Menu Synchronization**:
- Extended menu items schema to include `image` (URL) and `description` fields
- Added settings storage interface for persistent configuration (MongoDB URI)
- Created MongoDB service (`server/mongodbService.ts`) for external database connectivity
- Implemented API endpoints:
  - `GET /api/settings/mongodb-uri` - Retrieve saved MongoDB URI
  - `POST /api/settings/mongodb-uri` - Save MongoDB connection string
  - `POST /api/menu/sync-from-mongodb` - Sync menu items from MongoDB
- Enhanced Menu UI:
  - Simplified table layout (Item Name, Image, Category, Price, Status, Actions)
  - Three-dot hamburger menu for MongoDB operations
  - Database URI configuration dialog
  - Sync dialog with optional database name override
  - Edit dialog with full field support (name, category, price, cost, image, description, isVeg)
  - Image viewer dialog with Eye icon for quick preview
  - Error handling with user-friendly toast notifications

### Data Models

**Current Schema**: Minimal starter schema with users table, designed to be extended for:
- Menu items and categories
- Orders and order items
- Tables and reservations
- Inventory items and stock tracking
- Customers and loyalty programs
- Staff and attendance records
- Financial transactions and reports

**Schema Strategy**: Uses Drizzle-Zod integration for runtime validation and type safety across the stack.

## External Dependencies

### Database & ORM
- **Neon Serverless PostgreSQL**: Cloud-hosted PostgreSQL database
- **Drizzle ORM**: Type-safe ORM with schema migrations
- **Drizzle Kit**: Schema management and migration tooling

### UI Component Libraries
- **Radix UI**: Comprehensive set of unstyled, accessible UI primitives
  - Accordion, Alert Dialog, Avatar, Checkbox, Dialog, Dropdown Menu
  - Navigation Menu, Popover, Select, Slider, Tabs, Toast, Tooltip, etc.
- **CMDK**: Command palette component
- **Lucide React**: Icon library

### State & Data Management
- **TanStack React Query**: Server state management with caching
- **date-fns**: Date manipulation and formatting

### Development Tools
- **Vite**: Build tool and dev server
- **TypeScript**: Type safety across the codebase
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS & Autoprefixer**: CSS processing
- **ESBuild**: Fast bundler for production builds

### Replit Integration
- **@replit/vite-plugin-runtime-error-modal**: Error handling overlay
- **@replit/vite-plugin-cartographer**: Development navigation
- **@replit/vite-plugin-dev-banner**: Development mode indicator

### Utility Libraries
- **clsx & tailwind-merge**: Conditional class name utilities
- **class-variance-authority**: Component variant management
- **nanoid**: ID generation
- **ws**: WebSocket support for database connections

### Implemented Integrations
- **MongoDB Integration**: Full menu synchronization from external MongoDB databases
  - Secure URI storage via settings interface
  - Automatic database name extraction from appName parameter or URI path
  - Optional manual database name override
  - Fetches all collections and maps items to menu schema
  - Fields mapped: name, description, price, category, isVeg, image (restaurantName)
  - Cost automatically calculated as 40% of price for imported items

### Planned Integrations
- Payment gateways (Stripe, PayTM)
- Online ordering platforms (Zomato, Swiggy)
- Analytics (Google Analytics)
- Email/SMS services for notifications