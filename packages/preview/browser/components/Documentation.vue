<template>
  <div class="docs">
    <h2>{{ docValue.displayName }}</h2>
    <template v-if="docValue.props">
      <h3>Slots</h3>
      <Props :props="docValue.props" />
    </template>
    <template v-if="docValue.events">
      <h3>Events</h3>
      <Events :events="docValue.events" />
    </template>
    <template v-if="docValue.slots">
      <h3>Slots</h3>
      <Slots :slots="docValue.slots" />
    </template>
  </div>
</template>

<script>
import { ref } from 'vue';
import Slots from './docsParts/Slots.vue';
import Events from './docsParts/Events.vue';
import Props from './docsParts/Props.vue';

export default {
  components: { Props, Events, Slots },
  props: {
    docsSupplier: {
      type: Function,
      required: true,
    },
  },
  async setup({ docsSupplier }) {
    const mod = await docsSupplier();
    return { docValue: mod.default };
  },
};
</script>

<style scoped>
.docs {
  width: 200px;
  margin: 5px 10px;
}

.docs h2 {
  margin-bottom: 10px;
  padding: 5px;
  border-bottom: 1px solid #ccc;
}

.docs h3 {
  padding: 0 5px;
}
</style>
