table! {
    configs (id) {
        id -> Integer,
        key -> Text,
        value -> Nullable<Text>,
    }
}

table! {
    jobs (id) {
        id -> Integer,
        submitter -> Text,
        #[sql_name = "type"]
        type_ -> Text,
        source -> Text,
        status -> Nullable<Text>,
        destination -> Nullable<Text>,
        task_id -> Nullable<Text>,
    }
}

table! {
    users (id) {
        id -> Integer,
        user_name -> Text,
        password -> Text,
        real_name -> Nullable<Text>,
        class -> Nullable<Text>,
        student_id -> Nullable<Text>,
        role -> Text,
    }
}

allow_tables_to_appear_in_same_query!(configs, jobs, users,);
