import { closeSync, mkdirSync, openSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const databaseUrl = process.env.DATABASE_URL ?? 'file:/app/data/woof-watch.db';

if (databaseUrl.startsWith('file:')) {
	const filePath = databaseUrl.replace(/^file:/, '');

	if (filePath !== ':memory:') {
		const directory = path.dirname(filePath);
		if (directory !== '.') {
			mkdirSync(directory, { recursive: true });
		}

		closeSync(openSync(filePath, 'a'));

		const db = new Database(filePath);
		db.pragma('journal_mode = WAL');
		db.pragma('busy_timeout = 5000');
		db.pragma('foreign_keys = ON');
		db.close();
	}
}
