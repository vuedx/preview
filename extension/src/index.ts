import { ChildProcess, exec } from 'child_process';
import FS from 'fs';
import getPort from 'get-port';
import Path from 'path';
import vscode from 'vscode';

declare var __DEV__: boolean;
declare var __PROD__: boolean;
declare var __PREVIEW_INSTALLATION_SOURCE__: string;
interface ViteProcess {
  port: number;
  output: vscode.OutputChannel;
  instance: ChildProcess;
}

const processes = new Map<string, ViteProcess & { onReady: Promise<void> }>();

function findProjectDir(fileName: string): string {
  let dir = Path.dirname(fileName);
  while (dir !== Path.dirname(dir)) {
    if (FS.existsSync(Path.join(dir, 'package.json'))) {
      return dir;
    }

    dir = Path.dirname(dir);
  }

  return Path.dirname(fileName);
}

export async function activate(context: vscode.ExtensionContext) {
  const bin = Path.resolve(context.extensionPath, 'node_modules/@vuedx/preview/bin/preview.js');
  vscode.commands.executeCommand('setContext', 'preview:isViteStarted', true);
  async function getVitePort(rootDir: string) {
    if (processes.has(rootDir)) {
      return processes.get(rootDir).port;
    }

    return await getPort({ port: 65000 });
  }
  async function getViteInstance(bin: string, rootDir: string, port: number): Promise<ViteProcess> {
    await installPreview(bin, context);

    if (processes.has(rootDir)) {
      const result = processes.get(rootDir);
      await result.onReady;
      return result;
    }

    const output = vscode.window.createOutputChannel(`Preview (${processes.size})`);
    const instance = exec(`${bin} --force --port ${port}`, {
      cwd: rootDir,
      env: { ...process.env, CI: 'true' },
    });
    const onReady = new Promise<void>((resolve, reject) => {
      let isResolved = false;
      output.appendLine(`> Launching preview in ${rootDir}`);

      instance.stderr.on('data', (message) => {
        output.append(message.toString());
      });

      instance.stdout.on('data', (message) => {
        output.append(message.toString());
        if (/> Network: /.test(message.toString())) {
          isResolved = true;
          resolve();
        }
      });

      instance.on('exit', (code) => {
        output.clear();
        output.hide();
        output.dispose();
        if (!isResolved) {
          reject(new Error(`Preview exited with code: ${code}`));
        }
      });
    });

    const result = { port, output, instance, onReady };
    processes.set(rootDir, result);

    await onReady;

    return result;
  }
  context.subscriptions.push(
    vscode.commands.registerCommand('preview.show', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor == null) {
        vscode.window.showErrorMessage('No active editor');
        return;
      }

      const fileName = editor.document.fileName;
      if (!fileName.endsWith('.vue')) {
        vscode.window.showErrorMessage('Only .vue files are supported');
        return;
      }

      const rootDir = findProjectDir(fileName);
      const port = await getVitePort(rootDir);
      const panel = vscode.window.createWebviewPanel(
        'preview',
        `Preview ${Path.basename(fileName)}`,
        {
          viewColumn: vscode.ViewColumn.Beside,
          preserveFocus: true,
        },
        {
          enableFindWidget: true,
          retainContextWhenHidden: true,
          enableScripts: true,
          portMapping: [{ webviewPort: port, extensionHostPort: port }],
        }
      );
      panel.webview.html = getWebviewContent(
        '<div style="display: flex; height: 100%; align-items: center; justify-content: center;">Starting preview...</div>'
      );
      const { instance, output } = await getViteInstance(bin, rootDir, port);
      instance.stdin.write(JSON.stringify({ command: 'open', arguments: { fileName } }) + '\n');
      const id = Path.relative(rootDir, fileName);
      const uri = `http://localhost:${port}/sandbox?fileName=${encodeURIComponent(id)}`;
      output.appendLine(`Preview File: "${fileName}"`);
      output.appendLine(`URL: "${uri}"`);
      panel.webview.html = getWebviewContent(
        `
        <iframe style="border: none;" width="100%" height="100%" src="${uri}"></iframe>
        `
      );
    }),

    vscode.commands.registerCommand('preview.open', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor == null) {
        vscode.window.showErrorMessage('No active editor');
        return;
      }

      const fileName = editor.document.fileName;
      if (!fileName.endsWith('.vue')) {
        vscode.window.showErrorMessage('Only .vue files are supported');
        return;
      }

      const rootDir = findProjectDir(fileName);
      const port = await getVitePort(rootDir);
      const { instance, output } = await getViteInstance(bin, rootDir, port);
      instance.stdin.write(JSON.stringify({ command: 'open', arguments: { fileName } }) + '\n');
      const id = Path.relative(rootDir, fileName);
      const uri = `http://localhost:${port}/sandbox?fileName=${encodeURIComponent(id)}`;
      output.appendLine(`Preview File: "${fileName}"`);
      output.appendLine(`URL: "${uri}"`);
      vscode.env.openExternal(vscode.Uri.parse(uri));
    }),

    vscode.commands.registerCommand('preview.stop', async () => {
      await vscode.window.withProgress(
        {
          title: 'Shutting down preview',
          location: vscode.ProgressLocation.Notification,
          cancellable: false,
        },
        async () => {
          await stopVite();
        }
      );
    }),

    vscode.Disposable.from({
      dispose: async () => {
        await stopVite();
      },
    })
  );

  async function stopVite(): Promise<void> {
    const instances = Array.from(processes.values());

    instances.forEach((item) => {
      if (!item.instance.killed) {
        item.output.appendLine('Exiting preview.');
        item.instance.kill('SIGABRT');
      }
    });

    processes.clear();
    vscode.commands.executeCommand('setContext', 'preview:isViteStarted', false);
  }
}

async function installPreview(bin: string, context: vscode.ExtensionContext): Promise<void> {
  if (context.extensionMode === vscode.ExtensionMode.Development) return;
  if (!FS.existsSync(bin)) {
    await vscode.window.withProgress(
      {
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
        title: 'Installing @vuedx/preview',
      },
      (progress, token) => {
        return new Promise((resolve, reject) => {
          const output = vscode.window.createOutputChannel('Preview (installation)');
          const version = getExtensionName(context).includes('insiders') ? 'insiders' : 'latest';
          const command = __DEV__
            ? `pnpm install ${__PREVIEW_INSTALLATION_SOURCE__}`
            : `npm install @vuedx/preview@${version} --loglevel info`;
          if (__DEV__) output.show();
          output.appendLine(command);
          const installation = exec(command, {
            cwd: context.extensionPath,
            env: { ...process.env, CI: 'true' },
          });
          token.onCancellationRequested(() => {
            if (!installation.killed) installation.kill('SIGABRT');
          });
          installation.on('message', (chunk) => {
            output.append(chunk.toString());
          });
          installation.on('error', (error) => {
            output.appendLine(`Error: ${error.message}`);
            output.appendLine(error.stack ?? '');
          });
          installation.stdout.on('data', (chunk: Buffer) => {
            output.append(chunk.toString());
            progress.report({ message: chunk.toString() });
          });
          let error: string = '';
          installation.stderr.on('data', (chunk: Buffer) => {
            output.append(chunk.toString());
            error += chunk.toString();
          });
          installation.on('exit', (code) => {
            if (code !== 0) {
              reject(
                new Error(`Error: npm exited with non-zero status code: ${code}.\n\n${error}`)
              );
            } else {
              resolve(true);
            }
            if (__PROD__) output.dispose();
          });
        });
      }
    );
  }
}

function getExtensionName(context: vscode.ExtensionContext): string {
  try {
    const pkgFile = context.asAbsolutePath('package.json');
    console.log('PackageFile: ' + pkgFile);
    return require(pkgFile).name;
  } catch {
    return 'znck.preview';
  }
}

function getWebviewContent(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <style>
      html, body {
        padding: 0;
        margin: 0;
        height: 100%;
        overflow: auto;
      }
    </style>
</head>
<body>
${body}
<script>
window.addEventListener('message', event => {
  const { kind, payload } = event.data

  if (kind === 'event') {
    console.log('Dispatch event:', JSON.stringify(payload,null,2))
    if (payload.type.startsWith('key')) {
      window.dispatchEvent(new KeyboardEvent(payload.type, payload.init))
    }
  }
}, false)
</script>
</body>
</html>`;
}
