<template>
  <div id="overlay-page-name">
    <h4 class="overlay-heading">
      {{ text }}
    </h4>
  </div>
</template>

<script>
export default {
  name: 'OverlayPageName',
  props: {
    // text: {
    //   required: true,
    //   type: String,
    // },
  },
  data () {
    return {
      // text: '',
    };
  },
  computed: {
    text () {
      if (this.$route.meta && this.$route.meta.label) {
        return this.$route.meta.label;
      }
      return '';
      //  else {
      //   return this.$route.fullPath.replace(/^\/+/g, '');
      // }
    },
  },
  created () {

  },
};
</script>

<style scoped lang="scss">
#overlay-page-name {
  position: fixed;
  left: 2rem;
  top: 2rem;
  pointer-events: none;
  z-index: 500;

  h4 {
    margin: 0;
    color: rgba(255, 255, 255, 0.6);
  }
}
</style>
