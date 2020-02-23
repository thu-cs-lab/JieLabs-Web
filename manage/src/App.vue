<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
    >
      <h1>
        JieLabs Manage
      </h1>
    </v-app-bar>

    <v-content>
      <Main/>
    </v-content>
  </v-app>
</template>

<script>
import Main from './components/Main';

export default {
  name: 'App',

  components: {
    Main,
  },

  data: () => ({
    //
  }),
};
</script>
