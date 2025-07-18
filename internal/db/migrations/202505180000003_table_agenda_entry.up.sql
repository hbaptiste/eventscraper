CREATE TABLE IF NOT EXISTS agenda_entry (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		link TEXT NOT NULL,
		price float,
		address TEXT NOT NULL,
		time TEXT NOT NULL,
		description TEXT NOT NULL, 
		infos TEXT,
		poster TEXT,
		category TEXT,
		tag TEXT,
		place TEXT,
		status INTERGER DEFAULT 0)