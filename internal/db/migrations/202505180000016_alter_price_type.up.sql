--SELECT sql FROM sqlite_master WHERE type='table' AND name='agenda_entry';
CREATE TABLE agenda_entry_new (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		link TEXT NOT NULL,
		price TEXT NOT NULL,
		address TEXT NOT NULL,
		startdate TEXT NOT NULL,
		description TEXT NOT NULL, 
		infos TEXT,
		poster TEXT,
		category TEXT,
		tag TEXT,
		place TEXT,
		status INTERGER DEFAULT 0, 
        starttime TEXT DEFAULT "" NOT NULL, 
        endtime TEXT DEFAULT "" NOT NULL, 
        event_lifecycle_status TEXT DEFAULT "" NOT NULL, 
        subtitle TEXT DEFAULT "", enddate TEXT DEFAULT "", 
        venuename TEXT DEFAULT "", 
        event_owner INTEGER DEFAULT 0 NOT NULL);

-- Copy data from old table, converting price to text
INSERT INTO agenda_entry_new 
SELECT 
    id,
    title,
    link,
    CASE 
        WHEN price IS NULL THEN ''
        ELSE CAST(price AS TEXT)
    END as price,
    address,
    startdate,
    description,
    infos,
    poster,
    category,
    tag,
    place,
    status,
    starttime,
    endtime,
    event_lifecycle_status,
    subtitle,
    enddate,
    venuename,
    event_owner
FROM agenda_entry;

-- Drop old table and rename new one
DROP TABLE agenda_entry;
ALTER TABLE agenda_entry_new RENAME TO agenda_entry;