<script>
import { defineComponent } from 'vue'

export default defineComponent()
</script>

<template>
  <div>Hello</div>
</template>

<preview name="example preview block">
  <setup
    :request="{
      '/foo': $p.http.status(404)
    }"
    :components="{
      Foo: $p.stub('Foo Mocked')
    }"
    :state="{
      foo: 1
    }"
  />

  <Example />
</preview>

