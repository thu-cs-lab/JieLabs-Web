table! {
    configs (id) {
        id -> Int4,
        key -> Text,
        value -> Nullable<Text>,
    }
}

table! {
    jobs (id) {
        id -> Int4,
        submitter -> Text,
        #[sql_name = "type"]
        type_ -> Text,
        source -> Text,
        status -> Nullable<Text>,
        destination -> Nullable<Text>,
        metadata -> Text,
        task_id -> Nullable<Text>,
        created_at -> Timestamptz,
        finished_at -> Nullable<Timestamptz>,
    }
}

table! {
    users (id) {
        id -> Int4,
        user_name -> Text,
        password -> Nullable<Text>,
        real_name -> Nullable<Text>,
        class -> Nullable<Text>,
        student_id -> Nullable<Text>,
        role -> Text,
        last_login -> Nullable<Timestamptz>,
    }
}

allow_tables_to_appear_in_same_query!(configs, jobs, users,);
