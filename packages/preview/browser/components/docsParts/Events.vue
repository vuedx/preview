<template>
  <h3>Events</h3>
  <table>
    <thead>
      <th>Name</th>
      <th>Description</th>
      <th>Properties</th>
    </thead>
    <tbody>
      <tr v-for="event in events" :key="event.name">
        <td>{{ event.name }}</td>
        <td>{{ event.description }}</td>
        <td>
          <li v-for="property in event.properties">
            <strong>{{ property.name }}</strong> {{ property.type.names.join('|') }} -
            {{ property.description }}
          </li>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script>
export default {
  props: {
    events: {
      type: Array,
      required: true,
    },
  },
};
</script>
