const start = Date.now();
import * as chalk from 'chalk';
import * as path from 'path';
import { createServer } from 'vite';
import createDebugLogger from 'debug';
import { PreviewPlugin } from './plugin';

const debug = createDebugLogger('preview:cli');

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
    argv._[1] = argv._[0];
    argv._[0] = 'serve';
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

  if (!command || command === 'serve') {
    runServe(resolveOptions('development', argv));
  } else {
    // ???
  }
}

function resolveOptions(mode: string, argv: any): ServeArgs {
  const options: ServeArgs = {
    mode,
    port: 3000,
    open: false,
    root: process.cwd(),
  };

  if (argv.base != null) options.base = argv.base;
  if (argv.mode != null) options.mode = argv.mode;
  if (argv.port != null) options.port = parseInt(argv.port);
  if (argv.open != null) options.open = true;

  // normalize root
  // assumes all commands are in the form of `preview [command] [root]`
  if (!argv.root && argv._[1]) {
    options.root = argv._[1];
  }

  options.root = path.isAbsolute(options.root) ? options.root : path.resolve(options.root);

  return options;
}

interface ServeArgs {
  mode: string;
  port: number;
  open: boolean;
  root: string;
  base?: string;
  config?: string;
}

async function runServe(options: ServeArgs) {
  const server = await createServer({
    root: options.root,
    mode: options.mode,
    logLevel: 'info',
    server: {
      port: options.port,
      open: options.open,
    },
    plugins: PreviewPlugin(),
    configFile: options.config,
  });

  await server.listen(options.port);
}
