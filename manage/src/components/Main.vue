<template>
  <v-container>
    <v-card flat tile>
      <v-window v-model="window" class="elevation-1">
        <v-window-item :key="0">
          <v-card>
            <v-card-title>Job</v-card-title>
            <v-card-text>
              <v-data-table
                :headers="job_headers"
                :items="jobs"
                :options.sync="job_options"
                :server-items-length="job_count"
                :loading="loading"
              >
                <template v-slot:item.src_url="{ item }">
                  <v-btn icon :href="item.src_url" target="_blank">
                    <v-icon>mdi-download</v-icon>
                  </v-btn>
                </template>
                <template v-slot:item.dst_url="{ item }">
                  <v-btn icon :href="item.dst_url" target="_blank">
                    <v-icon>mdi-download</v-icon>
                  </v-btn>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-window-item>
        <v-window-item :key="1">
          <v-card>
            <v-card-title>User</v-card-title>
            <v-card-text>
              <v-data-table
                :headers="user_headers"
                :items="users"
                :options.sync="user_options"
                :server-items-length="user_count"
                :loading="loading"
              ></v-data-table>
            </v-card-text>
          </v-card>
        </v-window-item>
        <v-window-item :key="2">
          <v-card>
            <v-card-title>
              Board
              <v-spacer></v-spacer>
              <v-btn text color="primary" v-on:click="update_boards">
                <v-icon>mdi-refresh</v-icon>
              </v-btn>
            </v-card-title>
            <v-card-text>
              <v-data-table :headers="board_headers" :items="boards" :options="board_options"></v-data-table>
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>
      <v-card-actions class="justify-space-between">
        <v-btn text @click="window = (window + length - 1) % length">
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>
        <v-item-group v-model="window" class="text-center" mandatory>
          <v-item v-for="n in length" :key="`btn-${n}`" v-slot:default="{ active, toggle }">
            <v-btn :input-value="active" icon @click="toggle">
              <v-icon>mdi-record</v-icon>
            </v-btn>
          </v-item>
        </v-item-group>
        <v-btn text @click="window += 1">
          <v-icon>mdi-chevron-right</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script>
import { get } from "../util";
export default {
  name: "Main",

  data: () => ({
    window: 0,
    length: 3,

    users: [],
    user_headers: [
      {
        text: "id",
        align: "left",
        sortable: false,
        value: "id"
      },
      {
        text: "User Name",
        align: "left",
        sortable: false,
        value: "user_name"
      },
      {
        text: "Real Name",
        align: "left",
        sortable: false,
        value: "real_name"
      },
      {
        text: "Class",
        align: "left",
        sortable: false,
        value: "class"
      },
      {
        text: "Student Id",
        align: "left",
        sortable: false,
        value: "student_id"
      },
      {
        text: "Role",
        align: "left",
        sortable: false,
        value: "role"
      }
    ],
    user_options: {},
    user_count: 0,

    boards: [],
    board_headers: [
      {
        text: "Remote",
        align: "left",
        sortable: false,
        value: "remote"
      },
      {
        text: "Software Version",
        align: "left",
        sortable: false,
        value: "software_version"
      },
      {
        text: "Hardware Version",
        align: "left",
        sortable: false,
        value: "hardware_version"
      }
    ],
    board_options: {},

    jobs: [],
    job_headers: [
      {
        text: "id",
        align: "left",
        sortable: false,
        value: "id"
      },
      {
        text: "Submitter",
        align: "left",
        sortable: false,
        value: "submitter"
      },
      {
        text: "Type",
        align: "left",
        sortable: false,
        value: "type_"
      },
      {
        text: "Status",
        align: "left",
        sortable: false,
        value: "status"
      },
      {
        text: "Source",
        align: "left",
        sortable: false,
        value: "src_url"
      },
      {
        text: "Dest",
        align: "left",
        sortable: false,
        value: "dst_url"
      }
    ],
    job_options: {},
    job_count: 0,
    loading: false
  }),

  async mounted() {
    await this.update_boards();
    await this.update_users();
    await this.update_jobs();
  },

  methods: {
    async update_jobs() {
      this.loading = true;
      let itemsPerPage = this.job_options.itemsPerPage || 10;
      let page = this.job_options.page || 1;
      let jobs = await get(
        `/api/task/list?offset=${itemsPerPage *
          (page - 1)}&limit=${itemsPerPage}`
      );
      this.jobs = jobs.jobs;
      this.job_count = await get("/api/task/count");
      this.loading = false;
    },

    async update_users() {
      this.loading = true;
      let itemsPerPage = this.user_options.itemsPerPage || 10;
      let page = this.user_options.page || 1;
      let users = await get(
        `/api/user/list?offset=${itemsPerPage *
          (page - 1)}&limit=${itemsPerPage}`
      );
      this.users = users.users;
      this.user_count = await get("/api/user/count");
      this.loading = false;
    },

    async update_boards() {
      let boards = await get("/api/board/list");
      this.boards = boards;
    }
  },
  watch: {
    job_options: {
      async handler() {
        await this.update_jobs();
      },
      deep: true
    },
    user_options: {
      async handler() {
        await this.update_users();
      },
      deep: true
    }
  }
};
</script>
