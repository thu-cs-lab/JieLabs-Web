CREATE TABLE users(
    id int NOT NULL,
    user_name varchar(256) NOT NULL,
    password text NOT NULL,
    real_name text NULL,
    class text NULL,
    student_id text NULL,
    PRIMARY KEY (id),
    UNIQUE (user_name)
)

