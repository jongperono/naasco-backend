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

// // ─────────────────────────────────────────────────────────────
// // AUDIT LOG (track important actions)
// // ─────────────────────────────────────────────────────────────
// export const auditLogs = mysqlTable(
//   'audit_logs',
//   {
//     id: int('id').autoincrement().primaryKey(),
//     userId: int('user_id').references(() => users.id, {
//       onDelete: 'set null',
//     }),
//     action: varchar('action', { length: 100 }).notNull(),
//     resource: varchar('resource', { length: 100 }),
//     resourceId: varchar('resource_id', { length: 100 }),
//     metadata: text('metadata'), // store JSON as string
//     ipAddress: varchar('ip_address', { length: 45 }),
//     userAgent: text('user_agent'),
//     createdAt: timestamp('created_at').notNull().defaultNow(),
//   },
//   (table) => ({
//     userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
//     actionIdx: index('audit_logs_action_idx').on(table.action),
//     createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
//   })
// );

// // ─────────────────────────────────────────────────────────────
// // RELATIONS
// // ─────────────────────────────────────────────────────────────
// export const rolesRelations = relations(roles, ({ many }) => ({
//   users: many(users),
//   rolePermissions: many(rolePermissions),
// }));

// export const usersRelations = relations(users, ({ one, many }) => ({
//   role: one(roles, {
//     fields: [users.roleId],
//     references: [roles.id],
//   }),
//   sessions: many(sessions),
//   passwordResetTokens: many(passwordResetTokens),
//   auditLogs: many(auditLogs),
// }));

// export const permissionsRelations = relations(permissions, ({ many }) => ({
//   rolePermissions: many(rolePermissions),
// }));

// export const rolePermissionsRelations = relations(
//   rolePermissions,
//   ({ one }) => ({
//     role: one(roles, {
//       fields: [rolePermissions.roleId],
//       references: [roles.id],
//     }),
//     permission: one(permissions, {
//       fields: [rolePermissions.permissionId],
//       references: [permissions.id],
//     }),
//   })
// );

// export const sessionsRelations = relations(sessions, ({ one }) => ({
//   user: one(users, {
//     fields: [sessions.userId],
//     references: [users.id],
//   }),
// }));

// export const passwordResetTokensRelations = relations(
//   passwordResetTokens,
//   ({ one }) => ({
//     user: one(users, {
//       fields: [passwordResetTokens.userId],
//       references: [users.id],
//     }),
//   })
// );

// export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
//   user: one(users, {
//     fields: [auditLogs.userId],
//     references: [users.id],
//   }),
// }));

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// export type Session = typeof sessions.$inferSelect;
// export type NewSession = typeof sessions.$inferInsert;

// export type Permission = typeof permissions.$inferSelect;
// export type NewPermission = typeof permissions.$inferInsert;

// export type RolePermission = typeof rolePermissions.$inferSelect;
// export type NewRolePermission = typeof rolePermissions.$inferInsert;

// export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
// export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// export type AuditLog = typeof auditLogs.$inferSelect;
// export type NewAuditLog = typeof auditLogs.$inferInsert;