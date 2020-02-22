CREATE TABLE jobs (
    id SERIAL NOT NULL,
    submitter TEXT NOT NULL,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT,
    destination TEXT,
    metadata TEXT NOT NULL DEFAULT TEXT '{}',
    task_id TEXT,
    PRIMARY KEY (id),
    UNIQUE (task_id)
)
