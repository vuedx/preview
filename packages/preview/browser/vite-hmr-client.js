// This file runs in the browser.
console.log('[preview/vite] connecting...');
const socketProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const socketUrl = `${socketProtocol}://${window.location.hostname}:${window.location.port}`;
const socket = new window.WebSocket(socketUrl, 'vite-hmr');
function warnFailedFetch(err, path) {
  if (!err.message.match('fetch')) {
    console.error(err);
  }
  console.error(
    `[preview/hmr] Failed to reload ${path}. ` +
      `This could be due to syntax errors or importing non-existent ` +
      `modules. (see errors above)`
  );
}
// Listen for messages
socket.addEventListener('message', async ({ data }) => {
  const payload = JSON.parse(data);
  if (payload.type === 'multi') {
    payload.updates.forEach(handleMessage);
  } else {
    handleMessage(payload);
  }
});
async function handleMessage(payload) {
  const { path, changeSrcPath, timestamp } = payload;
  switch (payload.type) {
    case 'connected':
      console.log(`[preview/vite] connected.`);
      break;
    case 'js-update':
      queueUpdate(updateModule(path, changeSrcPath, timestamp));
      break;

    case 'custom':
      {
        const cbs = customUpdateMap.get(payload.id);
        if (cbs) {
          cbs.forEach((cb) => cb(payload.customData));
        }
      }
      break;
    case 'full-reload': {
      if (path.endsWith('.html')) {
        // if html file is edited, only reload the page if the browser is
        // currently on that page.
        const pagePath = window.location.pathname;
        if (pagePath === path || (pagePath.endsWith('/') && pagePath + 'index.html' === path)) {
          window.location.reload();
        }
      } else {
        window.location.reload();
      }
      break;
    }
  }
}
let pending = false;
let queued = [];
/**
 * buffer multiple hot updates triggered by the same src change
 * so that they are invoked in the same order they were sent.
 * (otherwise the order may be inconsistent because of the http request round trip)
 */
async function queueUpdate(p) {
  queued.push(p);
  if (!pending) {
    pending = true;
    await Promise.resolve();
    pending = false;
    const loading = [...queued];
    queued = [];
    (await Promise.all(loading)).forEach((fn) => fn && fn());
  }
}
// ping server
socket.addEventListener('close', () => {
  console.log(`[preview/vite] server connection lost. polling for restart...`);
  setInterval(() => {
    window
      .fetch('/')
      .then(() => {
        window.location.reload();
      })
      .catch((e) => {
        /* ignore */
      });
  }, 1000);
});

async function updateModule(id, changedPath, timestamp) {
  const mod = hotModulesMap.get(id);
  if (!mod) {
    console.error(
      `[preview/vite] got js update notification for "${id}" but no client callback ` +
        `was registered. Something is wrong.`
    );
    console.error(hotModulesMap);
    return;
  }
  const moduleMap = new Map();
  const isSelfUpdate = id === changedPath;
  // make sure we only import each dep once
  const modulesToUpdate = new Set();
  if (isSelfUpdate) {
    // self update - only update self
    modulesToUpdate.add(id);
  } else {
    // dep update
    for (const { deps } of mod.callbacks) {
      if (Array.isArray(deps)) {
        deps.forEach((dep) => modulesToUpdate.add(dep));
      } else {
        modulesToUpdate.add(deps);
      }
    }
  }
  // determine the qualified callbacks before we re-import the modules
  const callbacks = mod.callbacks.filter(({ deps }) => {
    return Array.isArray(deps)
      ? deps.some((dep) => modulesToUpdate.has(dep))
      : modulesToUpdate.has(deps);
  });
  await Promise.all(
    Array.from(modulesToUpdate).map(async (dep) => {
      const disposer = disposeMap.get(dep);
      if (disposer) await disposer(dataMap.get(dep));
      try {
        const newMod = await import(
          /* @vite-ignore */ dep + (dep.includes('?') ? '&' : '?') + `t=${timestamp}`
        );
        moduleMap.set(dep, newMod);
      } catch (e) {
        warnFailedFetch(e, dep);
      }
    })
  );
  return () => {
    for (const { deps, fn } of callbacks) {
      if (Array.isArray(deps)) {
        fn(deps.map((dep) => moduleMap.get(dep)));
      } else {
        fn(moduleMap.get(deps));
      }
    }
    console.log(`[preview/vite]: js module hot updated: `, id);
  };
}
const hotModulesMap = new Map();
const disposeMap = new Map();
const dataMap = new Map();
const customUpdateMap = new Map();
export const createHotContext = (id) => {
  if (!dataMap.has(id)) {
    dataMap.set(id, {});
  }
  // when a file is hot updated, a new context is created
  // clear its stale callbacks
  const mod = hotModulesMap.get(id);
  if (mod) {
    mod.callbacks = [];
  }
  const hot = {
    get data() {
      return dataMap.get(id);
    },
    accept(callback = () => {}) {
      hot.acceptDeps(id, callback);
    },
    acceptDeps(deps, callback = () => {}) {
      const mod = hotModulesMap.get(id) || {
        id,
        callbacks: [],
      };
      mod.callbacks.push({
        deps: deps,
        fn: callback,
      });
      hotModulesMap.set(id, mod);
    },
    dispose(cb) {
      disposeMap.set(id, cb);
    },
    // noop, used for static analysis only
    decline() {},
    invalidate() {
      window.location.reload();
    },
    // custom events
    on(event, cb) {
      const existing = customUpdateMap.get(event) || [];
      existing.push(cb);
      customUpdateMap.set(event, existing);
    },
  };
  return hot;
};
