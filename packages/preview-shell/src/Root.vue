<script lang="ts" setup>
import DeviceFrameHack from './components/device-frame-hack.vue';
</script>

<template>
  <div>
    <RouterView />
    <DeviceFrameHack />
  </div>
</template>

<style>
@tailwind base;
@tailwind components;
@tailwind utilities;
</style>
