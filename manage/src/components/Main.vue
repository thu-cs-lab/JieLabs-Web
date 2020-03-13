<template>
  <v-container>
    <v-card flat tile>
      <v-window v-model="window" class="elevation-1">
        <v-window-item :key="0">
          <v-card>
            <v-card-title>
              Job
              <v-spacer></v-spacer>
              <v-btn text color="primary" v-on:click="update_jobs">
                <v-icon>mdi-refresh</v-icon>
              </v-btn>
            </v-card-title>
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
          <v-data-table
            :headers="user_headers"
            :items="users"
            :options.sync="user_options"
            :server-items-length="user_count"
            :loading="loading"
          >
            <template v-slot:top>
              <v-toolbar flat color="white">
                <v-toolbar-title>Users</v-toolbar-title>
                <v-divider class="mx-4" inset vertical></v-divider>
                <v-spacer></v-spacer>
                <v-dialog v-model="add_user_dialog" max-width="500px">
                  <template v-slot:activator="{ on }">
                    <v-btn text color="primary" v-on="on">
                      <v-icon>mdi-account-plus</v-icon>
                    </v-btn>
                  </template>
                  <v-card>
                    <v-card-title>
                      <span class="headline">Add User</span>
                    </v-card-title>

                    <v-card-text>
                      <v-container>
                        <v-row>
                          <v-col cols="12" sm="6" md="4">
                            <v-text-field v-model="new_user.user_name" label="User Name"></v-text-field>
                          </v-col>
                          <v-col cols="12" sm="6" md="4">
                            <v-text-field v-model="new_user.real_name" label="Real Name"></v-text-field>
                          </v-col>
                          <v-col cols="12" sm="6" md="4">
                            <v-text-field v-model="new_user.password" label="Password"></v-text-field>
                          </v-col>
                          <v-col cols="12" sm="6" md="4">
                            <v-text-field v-model="new_user.class" label="Class"></v-text-field>
                          </v-col>
                          <v-col cols="12" sm="6" md="4">
                            <v-text-field v-model="new_user.student_id" label="Student Id"></v-text-field>
                          </v-col>
                          <v-col cols="12" sm="6" md="4">
                            <v-text-field v-model="new_user.role" label="Role"></v-text-field>
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-card-text>

                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="blue darken-1" text @click="close">Cancel</v-btn>
                      <v-btn color="blue darken-1" text @click="add">Add</v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
                <v-btn text color="primary" v-on:click="update_users">
                  <v-icon>mdi-refresh</v-icon>
                </v-btn>
              </v-toolbar>
            </template>
            <template v-slot:item.action="{ item }">
              <v-icon small class="mr-2" @click="edit_user(item)">mdi-pencil-outline</v-icon>
              <v-icon small @click="delete_user(item)">mdi-delete</v-icon>
            </template>
          </v-data-table>
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
              <v-data-table :headers="board_headers" :items="boards" :options.sync="board_options">
                <template v-slot:item.action="{ item }">
                  <v-icon small class="mr-2" @click="ident_on(item)">mdi-lightbulb-on-outline</v-icon>
                  <v-icon small @click="ident_off(item)">mdi-lightbulb-outline</v-icon>
                </template>
              </v-data-table>
              <v-text-field label="Version" v-model="board_version[0]"></v-text-field>
              <v-text-field label="Url" v-model="board_version[1]"></v-text-field>
              <v-text-field label="Hash" v-model="board_version[2]"></v-text-field>
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
    <v-dialog v-model="edit_user_dialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span class="headline">Edit User</span>
        </v-card-title>

        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12" sm="6" md="4">
                <v-text-field v-model="editing_user.user_name" label="User Name" readonly></v-text-field>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field v-model="editing_user.real_name" label="Real Name"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field v-model="editing_user.password" label="Password"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field v-model="editing_user.class" label="Class"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field v-model="editing_user.student_id" label="Student Id"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field v-model="editing_user.role" label="Role"></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="close">Cancel</v-btn>
          <v-btn color="blue darken-1" text @click="save">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { get, getLines, post, put, delete_ } from "../util";
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
      },
      {
        text: "Last Login",
        align: "left",
        sortable: false,
        value: "last_login"
      },
      {
        text: "Session Count",
        align: "left",
        sortable: false,
        value: "session_count"
      },
      {
        text: "Action",
        align: "left",
        sortable: false,
        value: "action"
      }
    ],
    user_options: {},
    user_count: 0,

    editing_user: {},
    edit_user_dialog: false,
    new_user: { role: "user" },
    add_user_dialog: false,

    boards: [],
    board_headers: [
      {
        text: "Remote",
        align: "left",
        sortable: false,
        value: "board.remote"
      },
      {
        text: "Software Version",
        align: "left",
        sortable: false,
        value: "board.software_version"
      },
      {
        text: "Hardware Version",
        align: "left",
        sortable: false,
        value: "board.hardware_version"
      },
      {
        text: "Connected User",
        align: "left",
        sortable: false,
        value: "connected_user"
      },
      {
        text: "Action",
        align: "left",
        sortable: false,
        value: "action"
      }
    ],
    board_options: {},
    board_version: [],

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
      },
      {
        text: "Created At",
        align: "left",
        sortable: false,
        value: "created_at"
      },
      {
        text: "Finished At",
        align: "left",
        sortable: false,
        value: "finished_at"
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
      for (let i in this.jobs) {
        this.jobs[i].created_at = new Date(this.jobs[i].created_at);
        this.jobs[i].finished_at = new Date(this.jobs[i].finished_at);
      }
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
      for (let i in this.users) {
        this.users[i].last_login = new Date(this.users[i].last_login);
      }
      this.user_count = await get("/api/user/count");
      this.loading = false;
    },

    async update_boards() {
      let boards = await get("/api/board/list");
      this.boards = boards;
      this.board_version = await getLines("/api/board/version");
    },

    edit_user(user) {
      this.edit_user_dialog = true;
      this.editing_user = user;
    },

    async save() {
      this.close();
      await post(
        `/api/user/manage/${this.editing_user.user_name}`,
        this.editing_user
      );
      await this.update_users();
    },

    async add() {
      this.close();
      await put(`/api/user/manage/${this.new_user.user_name}`, this.new_user);
      await this.update_users();
    },

    async delete_user(user) {
      await delete_(`/api/user/manage/${user.user_name}`);
      await this.update_users();
    },

    close() {
      this.edit_user_dialog = false;
      this.add_user_dialog = false;
    },

    async ident_on(board) {
      await post(`/api/board/config`, {
        board: board.board.remote,
        ident: true,
      });
    },

    async ident_off(board) {
      await post(`/api/board/config`, {
        board: board.board.remote,
        ident: false,
      });
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
