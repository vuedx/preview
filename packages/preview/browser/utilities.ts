export function getQueryParams(search = location.search) {
  const params: Record<string, number | string | boolean> = {};

  search.split('&').forEach((param) => {
    const [name, value] = param.split('=');

    params[decodeURIComponent(name)] = value ? decodeURIComponent(value) : true;
  });

  return params;
}
