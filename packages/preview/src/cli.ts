import chalk from 'chalk';
import * as Path from 'path';
import * as FS from 'fs';
import { createServer } from 'vite';
import { version as viteVersion } from 'vite/package.json';
import { version as previewVersion } from '../package.json';
import { PreviewPlugin } from './index';
import VuePlugin from '@vitejs/plugin-vue';

function logHelp(): void {
  console.log(`
Usage: preview [command] [args] [--options]
Commands:
  preview                       Start server in current directory.
  preview serve [root=cwd]      Start server in target directory.
Options:
  --help, -h                 [boolean] show help
  --version, -v              [boolean] show version
  --force, -f                [boolean] force dependency optimization
  --config, -c               [string]  use specified config file
  --port                     [number]  port to use for serve
  --open                     [boolean] open browser on server start
  --base                     [string]  public base path for build (default: /)
`);
}

export async function run(argv: {
  help: boolean;
  h: boolean;
  version: boolean;
  v: boolean;
  _: string[];
}): Promise<void> {
  if (argv._[0] != null && !/^(build|serve)$/i.test(argv._[0])) {
    argv._[1] = argv._[0];
    argv._[0] = 'serve';
  }

  const command = argv._[0];

  console.log(chalk.cyan(`Preview v${previewVersion} (vite v${viteVersion})`));
  const { help, h, version, v } = argv;

  if (help || h) {
    logHelp();
    return;
  } else if (version || v) {
    return;
  }

  if (command == null || command === 'serve') {
    await runServe(resolveOptions('development', argv));
  } else if (command === 'build') {
    throw new Error(`'preview build' is not implemented`);
  } else {
    console.error(`Unknown command: ${command}`);
    logHelp();

    process.exit(127);
  }
}

function resolveOptions(
  mode: string,
  argv: { root?: string; open?: boolean; base?: string; mode?: string; port?: string; _: string[] }
): ServeArgs {
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
  if (argv.root == null && argv._[1] != null) {
    options.root = argv._[1];
  }

  options.root = Path.isAbsolute(options.root) ? options.root : Path.resolve(options.root);

  return options;
}

interface ServeArgs {
  mode: string;
  port: number;
  open: boolean;
  root: string;
  base?: string;
  config?: string;
  force?: boolean;
}

async function runServe(options: ServeArgs): Promise<void> {
  const hasViteConfig =
    FS.existsSync(Path.resolve(options.root, 'vite.config.js')) ||
    FS.existsSync(Path.resolve(options.root, 'vite.config.ts'));

  const server = await createServer({
    root: options.root,
    mode: options.mode,
    logLevel: 'info',
    server: {
      port: options.port,
      open: options.open,
      force: options.force,
    },
    plugins: hasViteConfig ? PreviewPlugin() : [VuePlugin(), ...PreviewPlugin()],
    configFile: options.config,
  });

  await server.listen(options.port);
}
