CREATE TABLE configs (
    id SERIAL NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (id),
    UNIQUE (key)
)