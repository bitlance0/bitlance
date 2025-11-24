// src/db/schema.ts
import {
  pgTable,
  text,
  timestamp,
  boolean,
  numeric,
  serial,
  jsonb,
  primaryKey,
  pgEnum,
  integer,
  varchar,
} from "drizzle-orm/pg-core";

export const roleIdEnum = pgEnum("role_id_enum", ["user", "collaborator", "admin", "super"]);
export const permTypeEnum = pgEnum("perm_type_enum", ["mandatory", "optional", "blocked"]);
export const permCatEnum = pgEnum("perm_cat_enum", ["trading", "analysis", "support", "admin", "admin2", "payments"]);

/**
 * Tabla de usuarios
 * - Info básica
 * - Roles y estados
 * - Balance
 * - Preferencias en JSON
 */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),

  // 🔹 Extensiones
  role: text("role").$type<"user" | "admin" | "collaborator">().default("user"),
  status: text("status")
    .$type<"active" | "inactive" | "banned">()
    .default("active"),
  balance: numeric("balance", { precision: 12, scale: 2 }).default("0.00"),

  // 🔹 JSON para configuraciones de usuario
  preferences: jsonb("preferences")
    .$type<{ theme?: string; notifications?: boolean }>()
    .default({}),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .defaultNow()
    .notNull(),
});

export const roles = pgTable("roles", {
  id: roleIdEnum("id").primaryKey(),               // 'user' | 'collaborator' | 'admin' | 'super'
  name: text("name").notNull(),                    // legible
  level: text("level").notNull(),                  // "1","2","3","4" (opcional)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const permissions = pgTable("permissions", {
  id: text("id").primaryKey(),                     // slug: 'trading_operate', 'payments_gateway', etc.
  name: text("name").notNull(),
  description: text("description"),
  category: permCatEnum("category").notNull(),     // 'trading'|'analysis'|'support'|'admin'|'admin2'|'payments'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    roleId: roleIdEnum("role_id")
      .references(() => roles.id)
      .notNull(),
    assignedBy: text("assigned_by"), // opcional: auditoría de quién asigna
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    // Coincide con la PK real: CONSTRAINT user_roles_user_id_pk PRIMARY KEY(user_id)
    pk: primaryKey({
      name: "user_roles_user_id_pk",
      columns: [t.userId],
    }),
  })
);




export const rolePermissions = pgTable("role_permissions", {
  roleId: roleIdEnum("role_id").references(() => roles.id).notNull(),
  permissionId: text("permission_id").references(() => permissions.id).notNull(),
  type: permTypeEnum("type").notNull(),            // 'mandatory'|'optional'|'blocked'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.roleId, t.permissionId] }),
}));

export const userPermissions = pgTable("user_permissions", {
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }).notNull(),
  permissionId: text("permission_id").references(() => permissions.id).notNull(),
  allow: boolean("allow").notNull(),               // true = conceder; false = revocar (solo aplica en optional)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.permissionId] }),
}));

/**
 * Tabla de sesiones (BetterAuth)
 * - Enlaza a user
 * - Se puede enriquecer con metadata (JSON)
 */
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .defaultNow()
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // 🔹 JSON para registrar ubicación o dispositivo
  location: jsonb("location").$type<{ country?: string; city?: string }>(),
});

/**
 * Tabla de cuentas sociales (Google, etc.)
 */
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .defaultNow()
    .notNull(),
});

/**
 * Tabla de verificaciones (para emails, códigos, etc.)
 */
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .defaultNow()
    .notNull(),
});

/**
 * Tabla de transacciones financieras
 * - Todas las operaciones quedan registradas (auditoría)
 */
export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: text("type")
    .$type<"deposit" | "withdrawal" | "transfer" | "trade">()
    .notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  status: text("status")
    .$type<"pending" | "completed" | "failed">()
    .default("pending"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const trades = pgTable("trades", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  side: text("side").$type<"buy" | "sell">().notNull(),
  orderType: text("order_type")
    .$type<"market" | "pending">()
    .notNull()
    .default("market"),
  entryPrice: numeric("entry_price", { precision: 12, scale: 4 }),
  closePrice: numeric("close_price", { precision: 12, scale: 4 }),
  quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
  leverage: numeric("leverage", { precision: 12, scale: 2 }).default("1"),
  takeProfit: numeric("take_profit", { precision: 12, scale: 4 }),
  stopLoss:  numeric("stop_loss",  { precision: 12, scale: 4 }),
  profit: numeric("profit", { precision: 12, scale: 2 }).default("0.00"),
  status: text("status")
    .$type<"open" | "closed" | "pending">()
    .default("open")
    .notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  triggerPrice: numeric("trigger_price", { precision: 12, scale: 4 }),
  triggerRule: text("trigger_rule"),
  expiresAt: timestamp("expires_at"),
});


/**
 * Tabla de cuentas de trading (para las cards de "Mis Cuentas")
 */
export const tradingAccounts = pgTable("trading_accounts", {
  id: text("id").primaryKey(), // usaremos randomUUID() al insertar

  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountNumber: text("account_number").notNull(),
  name: text("name").notNull().default("Cuenta estándar"),
  type: text("type").notNull().default("REAL"),
  status: text("status").notNull().default("ACTIVE"),
  isDefault: boolean("is_default").notNull().default(false),
  currency: text("currency").notNull().default("USD"),
  leverage: integer("leverage").notNull().default(100),
  balance: numeric("balance", { precision: 12, scale: 2 })
    .notNull()
    .default("0.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .defaultNow()
    .notNull(),
});

// Tipos de ayuda (opcionales)
export type TradingAccount = typeof tradingAccounts.$inferSelect;
export type NewTradingAccount = typeof tradingAccounts.$inferInsert;


export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  referenceId: varchar("reference_id", { length: 100 }).notNull(),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }).notNull(),
  stripeUrl: text("stripe_url").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),          // en centavos
  currency: varchar("currency", { length: 10 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  customerEmail: varchar("customer_email", { length: 255 }),
  accountId: varchar("account_id", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});