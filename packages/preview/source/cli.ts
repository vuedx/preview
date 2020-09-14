const start = Date.now();
import * as chalk from 'chalk';
import createDebugLogger from 'debug';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createServer, resolveConfig, ResolvedConfig, UserConfig } from 'vite';
import { createPreviewPlugin } from './plugin';

const debug = createDebugLogger('preview:cli');
debug.server = createDebugLogger('preview:server');

function logHelp() {
  console.log(`
Usage: preview [command] [args] [--options]
Commands:
  preview                       Start server in current directory.
  preview serve [root=cwd]      Start server in target directory.
Options:
  --help, -h                 [boolean] show help
  --version, -v              [boolean] show version
  --config, -c               [string]  use specified config file
  --port                     [number]  port to use for serve
  --open                     [boolean] open browser on server start
  --base                     [string]  public base path for build (default: /)
`);
}

export async function run(argv: any) {
  if (argv._[0] && !/^(build|serve)$/i.test(argv._[0])) {
    argv._[1] = argv._[0]
    argv._[0] = 'serve'
  }

  const command = argv._[0];

  console.log(
    chalk.cyan(
      `Preview v${require('../package.json').version} (vite v${
        require('vite/package.json').version
      })`
    )
  );
  const { help, h, mode, m, version, v } = argv;

  if (help || h) {
    logHelp();
    return;
  } else if (version || v) {
    return;
  }

  const options: ResolvedConfig = await resolveOptions('development', argv);

  if (!command || command === 'serve') {
    runServe(options);
  } else {
    // ???
  }
}

async function resolveOptions(mode: string, argv: any) {
  argv.mode = mode;

  // cast xxx=true | false into actual booleans
  Object.keys(argv).forEach((key) => {
    if (argv[key] === 'false') {
      argv[key] = false;
    }
    if (argv[key] === 'true') {
      argv[key] = true;
    }
  });

  // normalize root
  // assumes all commands are in the form of `preview [command] [root]`
  if (!argv.root && argv._[1]) {
    argv.root = argv._[1];
  }

  if (argv.root) {
    argv.root = path.isAbsolute(argv.root) ? argv.root : path.resolve(argv.root);
  } else {
    argv.root = process.cwd();
  }

  const config = await resolveConfig(mode, argv.config || argv.c);

  return patchOptions({ ...config, ...argv });
}

function patchOptions(options: ResolvedConfig) {
  const rootDir = options.root!; // root is always set in resolveOptions()
  const internal = {
    setup: path.resolve(rootDir, 'node_modules/.preview/auto-setup.js'),
    index: path.resolve(rootDir, 'node_modules/.preview/component-index.js'),
  };
  const configPath = path.resolve(rootDir, 'process.config.js');
  const userOptions = fs.existsSync(configPath) ? require(configPath) : {};
  const { configureServer, blockProcessor } = createPreviewPlugin({
    rootDir,
    include: ['**/*.vue'],
    exclude: ['node_modules/**/*'],
    ...userOptions,
  });

  if (options.configureServer) {
    if (Array.isArray(options.configureServer)) {
      options.configureServer = [...options.configureServer, configureServer];
    } else {
      options.configureServer = [options.configureServer, configureServer];
    }
  } else {
    options.configureServer = configureServer;
  }

  options.vueCustomBlockTransforms = options.vueCustomBlockTransforms || {};

  options.vueCustomBlockTransforms.preview = blockProcessor;

  options.alias = options.alias || {};
  options.alias['/@preview/'] = path.resolve(__dirname, '../browser/');
  options.alias['@preview-component-index'] = '/node_modules/.preview/component-index.js';
  const setupFiles = [
    path.resolve(rootDir, 'preview.js'),
    path.resolve(rootDir, 'preview.ts'),
    internal.setup,
  ];

  fs.mkdirSync(path.resolve(process.cwd(), 'node_modules/.preview'), { recursive: true });
  fs.writeFileSync(internal.setup, '');
  fs.writeFileSync(internal.index, 'export const components = []');
  options.alias['@preview-auto-setup'] = '/' + path.relative(rootDir, setupFiles.find(fs.existsSync));

  return options;
}

async function runServe(options: UserConfig) {
  const server = createServer(options);

  let port = options.port || 3000;
  let hostname = options.hostname || 'localhost';
  const protocol = options.https ? 'https' : 'http';

  server.on('error', (e: Error & { code?: string }) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying another one...`);
      setTimeout(() => {
        server.close();
        server.listen(++port);
      }, 100);
    } else {
      console.error(chalk.red(`[preview] server error:`));
      console.error(e);
    }
  });

  server.listen(port, () => {
    console.log();
    console.log(`  Dev server running at:`);
    const interfaces = os.networkInterfaces();
    Object.keys(interfaces).forEach((key) => {
      (interfaces[key] || [])
        .filter((details) => details.family === 'IPv4')
        .map((detail) => {
          return {
            type: detail.address.includes('127.0.0.1') ? 'Local:   ' : 'Network: ',
            host: detail.address.replace('127.0.0.1', hostname),
          };
        })
        .forEach(({ type, host }) => {
          const url = `${protocol}://${host}:${chalk.bold(port)}/`;
          console.log(`  > ${type} ${chalk.cyan(url)}`);
        });
    });
    console.log();
    debug.server(`server ready in ${Date.now() - start}ms.`);

    if (options.open) {
      require('vite/dist/node/utils/openBrowser').openBrowser(`${protocol}://${hostname}:${port}`);
    }
  });
}
