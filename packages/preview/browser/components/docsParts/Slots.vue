<template>
  <h3>Slots</h3>
  <table>
    <thead>
      <th>Name</th>
      <th>Description</th>
    </thead>
    <tbody>
      <tr v-for="slot in slots" :key="slot.name">
        <td>{{ slot.name }}</td>
        <td>{{ slot.description }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script>
export default {
  props: {
    slots: {
      type: Array,
      required: true,
    },
  },
};
</script>