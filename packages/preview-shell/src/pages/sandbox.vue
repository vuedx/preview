<script lang="ts">
import Device from '../components/Device.vue';
import { defineComponent, ref, watchEffect } from 'vue';
import { ComponentMetadata, components } from '../components';
import Content from '../components/Content.vue';
export default defineComponent({
  props: {
    fileName: String,
  },

  components: {
    Device,
    Content,
  },

  setup(props) {
    const currentComponent = ref<ComponentMetadata>(null);
    const setCurrentComponent = () => {
      if (props.fileName != null) {
        const id = props.fileName;

        currentComponent.value = components.value.find((item) => item.path === id) ?? {
          id,
          name: '',
          path: props.fileName,
          previews: [],
        };
        console.log('Find', id, 'in', currentComponent.value);
      }
    };

    watchEffect(setCurrentComponent);
    setCurrentComponent();

    return { currentComponent };
  },
});
</script>

<template>
  <div class="sandbox">
    <template v-if="currentComponent">
      <template v-if="currentComponent.previews.length > 0">
        <Device
          v-for="preview of currentComponent.previews"
          :name="preview.device"
          v-bind="preview.deviceProps"
        >
          <Content :relativeFileName="currentComponent.path" :index="preview.id" />
        </Device>
      </template>
      <Device v-else name="freeform">
        <Content :relativeFileName="currentComponent.path" />
      </Device>
    </template>
    <div v-else>Select a component</div>
  </div>
</template>

<style>
.sandbox {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  min-height: 100vh;
}

.sandbox > * {
  margin: 2rem;
}
</style>
