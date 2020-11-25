<template>
  <h3>Props</h3>
  <table>
    <thead>
      <th>Name</th>
      <th>Description</th>
      <th>Type</th>
    </thead>
    <tbody>
      <tr v-for="prop in props" :key="prop.name">
        <td>{{ prop.name }}</td>
        <td>{{ prop.description }}</td>
        <td>{{ prop.type.name }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script>
export default {
  props: {
    props: {
      type: Array,
      required: true,
    },
  },
};
</script>
