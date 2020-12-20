import { ChildProcess, exec } from 'child_process';
import FS from 'fs';
import getPort from 'get-port';
import Path from 'path';
import vscode from 'vscode';

const processes = new Map<
  string,
  Promise<{ instance: ChildProcess; port: number; output: vscode.OutputChannel }>
>();

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
  async function getViteInstance(bin: string, rootDir: string) {
    if (processes.has(rootDir)) return await processes.get(rootDir);

    const result = new Promise<{
      instance: ChildProcess;
      port: number;
      output: vscode.OutputChannel;
    }>(async (resolve) => {
      const port = await getPort({ port: 11000 });

      const channel = vscode.window.createOutputChannel('Preview');

      channel.appendLine(`> Launching preview in ${rootDir}`);

      const instance = exec(`${bin} --port ${port}`, { cwd: rootDir });
      instance.stderr.on('data', (message) => {
        channel.append(message.toString());
      });

      instance.stdout.on('data', (message) => {
        channel.append(message.toString());
        if (/Dev server running at:/.test(message.toString())) {
          resolve({ port, instance, output: channel });
        }
      });
    });

    processes.set(rootDir, result);

    return await result;
  }
  context.subscriptions.push(
    vscode.commands.registerCommand('preview.showPreview', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor == null) return;

      const fileName = editor.document.fileName;
      if (!fileName.endsWith('.vue')) return;

      const rootDir = findProjectDir(fileName);
      const { instance, port, output } = await getViteInstance(bin, rootDir);
      instance.stdin.write(JSON.stringify({ command: 'open', arguments: { fileName } }) + '\n');
      const panel = vscode.window.createWebviewPanel(
        'preview',
        `Preview ${Path.basename(fileName)}`,
        {
          viewColumn: vscode.ViewColumn.Beside,
          preserveFocus: true,
        },
        {
          retainContextWhenHidden: true,
          enableScripts: true,
          // portMapping: [{ webviewPort: port, extensionHostPort: port }],
        }
      );
      panel.webview.html = getWebviewContent(
        '<div style="display: flex; height: 100%; align-items: center; justify-content: center;">Starting preview...</div>'
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const id = Path.relative(rootDir, fileName);
      const uri = `http://localhost:${port}/sandbox?fileName=${encodeURIComponent(id)}`;
      panel.webview.html = getWebviewContent(
        `<iframe style="border: none;"  width="100%" height="100%" src="${uri}"></iframe>`
      );
    }),
    vscode.Disposable.from({
      dispose: async () => {
        const instances = [...processes.values()];

        await Promise.all(
          instances.map(async (item) => {
            (await item).instance.kill('SIGABRT');
          })
        );
      },
    })
  );
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
</body>
</html>`;
}
