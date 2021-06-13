<script lang="ts" setup>
import { ref } from 'vue';
const foo = ref('');

fetch('/foo')
  .then((response) => response.json())
  .then((data) => {
    foo.value = data.foo;
  });
</script>

<template>
  <div>Hello {{ foo }}</div>
</template>

<preview name="greets world">
  <setup
    :requests="{
      '/foo': { foo: 'World' }
    }"
  />

  <MockFetchRequest />
</preview>

<preview name="greets everyone" width="200" height="100">
  <setup
    :requests="{
      '/foo': () => import('./api/foo.json')
    }"
  />

  <MockFetchRequest />
</preview>

<preview>
  <setup
    :requests="{
      '/response/object': { id: 1, name: 'bar' }, // Content-Type: application/json
      '/response/text': `{ id: 1, name: 'bar' }`, // Content-Type: text/plain
      '/response/body': $p.http(JSON.stringify({ id: 1, name: 'bar' }), 200),
      '/response/status': $p.http.status(202), // Set status/statusText with null response
      '/response/create': $p.http.create(/* body?: BodyInit, init?: ResponseInit */),
      '/foo': () => import('./api/foo.json'), // Only GET requests
      'GET /foo': () => import('./api/foo.json'),
      'GET|POST /foo': () => import('./api/foo.json'),
      '*': () => import('./api/foo.json'), // Wildcard requests
    }"
  />

  <MockFetchRequest />
</preview>
