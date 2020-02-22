CREATE TABLE users(
    id SERIAL NOT NULL,
    user_name TEXT NOT NULL,
    password TEXT NOT NULL,
    real_name TEXT NULL,
    class TEXT NULL,
    student_id TEXT NULL,
    role TEXT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (user_name)
)