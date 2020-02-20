CREATE TABLE jobs_new (
    id INTEGER PRIMARY KEY NOT NULL,
    submitter TEXT NOT NULL,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT,
    destination TEXT,
    task_id TEXT UNIQUE
)

INSERT INTO jobs_new SELECT id, submitter, type, source, status, destination, task_id FROM users;
DROP TABLE jobs;
ALTER TABLE jobs_new RENAME TO jobs;
