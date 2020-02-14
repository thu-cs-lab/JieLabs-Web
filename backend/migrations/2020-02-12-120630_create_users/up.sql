CREATE TABLE users (
    id INTEGER PRIMARY KEY NOT NULL,
    user_name TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    real_name TEXT,
    class TEXT,
    student_id TEXT
)

