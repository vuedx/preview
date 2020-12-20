<script>
import { defineComponent } from 'vue';
import DeviceFrameHack from './components/device-frame-hack.vue';

export default defineComponent({
  components: { DeviceFrameHack },
});
</script>

<template>
  <div>
    <RouterView />
    <device-frame-hack />
  </div>
</template>

<style>
@tailwind base;
@tailwind components;
@tailwind utilities;
</style>
