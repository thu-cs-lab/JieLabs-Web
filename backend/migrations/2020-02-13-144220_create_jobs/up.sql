CREATE TABLE jobs (
    id int NOT NULL,
    submitter text NOT NULL,
    type text NOT NULL,
    source text NOT NULL,
    status text NULL,
    destination text NULL,
    task_id varchar(256) NULL,
    PRIMARY KEY (id),
    UNIQUE (task_id)
)