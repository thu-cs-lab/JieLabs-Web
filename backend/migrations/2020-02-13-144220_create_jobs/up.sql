CREATE TABLE jobs (
    id INTEGER PRIMARY KEY NOT NULL,
    submitter TEXT NOT NULL,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT,
    destination TEXT,
    task_id TEXT UNIQUE
)
