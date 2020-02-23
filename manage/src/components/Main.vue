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
                  <a :href="item.src_url">Download</a>
                </template>
                <template v-slot:item.dst_url="{ item }">
                  <a :href="item.dst_url">Download</a>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-window-item>
        <v-window-item :key="1">Second window</v-window-item>
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
    length: 2,
    users: [],
    boards: [],
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
    loading: false,
    job_options: {},
    job_count: 0
  }),

  async mounted() {
    let users = await get("/api/user/list");
    this.users = users.users;
    let count = await get("/api/user/count");
    console.log(count);
    let boards = await get("/api/board/list");
    this.boards = boards;
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
    }
  },
  watch: {
    job_options: {
      async handler() {
        await this.update_jobs();
      },
      deep: true
    }
  }
};
</script>
