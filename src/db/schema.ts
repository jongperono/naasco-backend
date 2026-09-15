import {
  mysqlTable,
  int,
  varchar,
  timestamp,
  text,
  boolean,
  index,
  uniqueIndex,
  datetime,
  mysqlEnum,
} from 'drizzle-orm/mysql-core';
import { relations, sql } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────────────────────
export const roles = mysqlTable('roles', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// ─────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────
export const users = mysqlTable(
  'users',
  {
    id: int('id').autoincrement().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: text('password').notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    middleName: varchar('middle_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 20 }),

    roleId: int('role_id')
      .notNull()
      .references(() => roles.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),

    isActive: boolean('is_active').notNull().default(true),
    emailVerifiedAt: timestamp('email_verified_at'),
    lastLoginAt: timestamp('last_login_at'),
    deletedAt: timestamp('deleted_at'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    roleIdIdx: index('users_role_id_idx').on(table.roleId),
    isActiveIdx: index('users_is_active_idx').on(table.isActive),
    deletedAtIdx: index('users_deleted_at_idx').on(table.deletedAt),
    // Unique email only among non-deleted users
    emailActiveUnique: uniqueIndex('users_email_active_unique').on(
      table.email,
      table.deletedAt
    ),
  })
);

// ─────────────────────────────────────────────────────────────
// SESSIONS (for auth)
// ─────────────────────────────────────────────────────────────
// export const sessions = mysqlTable(
//   'sessions',
//   {
//     id: varchar('id', { length: 255 }).primaryKey(),
//     userId: int('user_id')
//       .notNull()
//       .references(() => users.id, { onDelete: 'cascade' }),
//     token: varchar('token', { length: 500 }).notNull().unique(),
//     ipAddress: varchar('ip_address', { length: 45 }),
//     userAgent: text('user_agent'),
//     expiresAt: timestamp('expires_at').notNull(),
//     createdAt: timestamp('created_at').notNull().defaultNow(),
//   },
//   (table) => ({
//     userIdIdx: index('sessions_user_id_idx').on(table.userId),
//     expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
//   })
// );

// // ─────────────────────────────────────────────────────────────
// // PERMISSIONS
// // ─────────────────────────────────────────────────────────────
// export const permissions = mysqlTable('permissions', {
//   id: int('id').autoincrement().primaryKey(),
//   name: varchar('name', { length: 100 }).notNull().unique(),
//   description: text('description'),
//   resource: varchar('resource', { length: 100 }).notNull(),
//   action: varchar('action', { length: 50 }).notNull(),
//   createdAt: timestamp('created_at').notNull().defaultNow(),
//   updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
// });

// // ─────────────────────────────────────────────────────────────
// // ROLE ↔ PERMISSION (many-to-many)
// // ─────────────────────────────────────────────────────────────
// export const rolePermissions = mysqlTable(
//   'role_permissions',
//   {
//     id: int('id').autoincrement().primaryKey(),
//     roleId: int('role_id')
//       .notNull()
//       .references(() => roles.id, { onDelete: 'cascade' }),
//     permissionId: int('permission_id')
//       .notNull()
//       .references(() => permissions.id, { onDelete: 'cascade' }),
//     createdAt: timestamp('created_at').notNull().defaultNow(),
//   },
//   (table) => ({
//     rolePermissionUnique: uniqueIndex('role_permission_unique').on(
//       table.roleId,
//       table.permissionId
//     ),
//     roleIdIdx: index('role_permissions_role_id_idx').on(table.roleId),
//     permissionIdIdx: index('role_permissions_permission_id_idx').on(
//       table.permissionId
//     ),
//   })
// );

// // ─────────────────────────────────────────────────────────────
// // PASSWORD RESET TOKENS
// // ─────────────────────────────────────────────────────────────
// export const passwordResetTokens = mysqlTable(
//   'password_reset_tokens',
//   {
//     id: int('id').autoincrement().primaryKey(),
//     userId: int('user_id')
//       .notNull()
//       .references(() => users.id, { onDelete: 'cascade' }),
//     token: varchar('token', { length: 255 }).notNull().unique(),
//     expiresAt: timestamp('expires_at').notNull(),
//     usedAt: timestamp('used_at'),
//     createdAt: timestamp('created_at').notNull().defaultNow(),
//   },
//   (table) => ({
//     userIdIdx: index('password_reset_user_id_idx').on(table.userId),
//     tokenIdx: index('password_reset_token_idx').on(table.token),
//   })
// );

// ─────────────────────────────────────────────────────────────
// AUDIT LOGS (track important actions)
// ─────────────────────────────────────────────────────────────
export const auditLogs = mysqlTable(
  'audit_logs',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: int('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 20 }).notNull(), // CREATE/UPDATE/DELETE/LOGIN/APPROVE
    entityType: varchar('entity_type', { length: 50 }).notNull(), // 'loan','savings','member'
    entityId: int('entity_id'), // PK of affected record
    oldValues: text('old_values'), // JSON string, null for CREATE
    newValues: text('new_values'), // JSON string, null for DELETE
    ipAddress: varchar('ip_address', { length: 45 }), // supports IPv4 and IPv6
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // idx_audit_entity: ON audit_logs (entity_type, entity_id)
    entityIdx: index('idx_audit_entity').on(table.entityType, table.entityId),
    // idx_audit_user: ON audit_logs (user_id, created_at DESC)
    userIdx: index('idx_audit_user').on(table.userId, table.createdAt),
    // idx_audit_created: ON audit_logs (created_at DESC)
    createdIdx: index('idx_audit_created').on(table.createdAt),
  })
);

// ─────────────────────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────────────────────
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  auditLogs: many(auditLogs),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;