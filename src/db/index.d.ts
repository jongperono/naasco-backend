import mysql from 'mysql2/promise';
import * as schema from './schema';
declare const pool: mysql.Pool;
export declare const db: import("drizzle-orm/mysql2").MySql2Database<typeof schema> & {
    $client: mysql.Pool;
};
export { pool };
//# sourceMappingURL=index.d.ts.map