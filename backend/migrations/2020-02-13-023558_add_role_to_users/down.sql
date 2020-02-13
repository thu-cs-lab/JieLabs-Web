CREATE TABLE users_new (
    id INTEGER PRIMARY KEY NOT NULL,
    user_name TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    real_name TEXT,
    class TEXT,
    student_id TEXT
);

INSERT INTO users_new SELECT id, user_name, password, real_name, class, student_id FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;