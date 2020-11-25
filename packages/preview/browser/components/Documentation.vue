<template>
  <div class="docs">
    <h2>{{ docValue.displayName }}</h2>
    <p>{{ docValue.description }}</p>
    <Props v-if="docValue.props" :props="docValue.props" />
    <Events v-if="docValue.events" :events="docValue.events" />
    <Slots v-if="docValue.slots" :slots="docValue.slots" />
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
