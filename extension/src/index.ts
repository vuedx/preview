import { ChildProcess, exec } from 'child_process';
import * as FS from 'fs';
import getPort from 'get-port';
import * as Path from 'path';
import vscode from 'vscode';
import { getWebviewContent } from './getWebviewContent';

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

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const bin = Path.resolve(context.extensionPath, 'node_modules/@vuedx/preview/bin/preview.js');
  // TODO: Use global installation in .vuedx/preview directory.
  await vscode.commands.executeCommand('setContext', 'preview:isViteStarted', true);

  let activeWebviewPanel: vscode.WebviewPanel | undefined;
  const previewSources = new Map<vscode.WebviewPanel, { fileName: string; uri: string }>();
  function getActiveVueFile(): string | undefined {
    const fileName =
      activeWebviewPanel != null ? previewSources.get(activeWebviewPanel)?.fileName : undefined;

    return fileName ?? vscode.window.activeTextEditor?.document?.fileName;
  }

  async function getVitePort(rootDir: string): Promise<number> {
    const p = processes.get(rootDir);
    if (p != null) {
      return p.port;
    }

    return await getPort({ port: 65000 });
  }
  async function getViteInstance(bin: string, rootDir: string, port: number): Promise<ViteProcess> {
    await installPreview(bin, context);

    if (processes.has(rootDir)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result = processes.get(rootDir)!;
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

      instance.stderr?.on('data', (message) => {
        output.append(message.toString());
      });

      instance.stdout?.on('data', (message) => {
        console.log(message);
        output.append(message.toString());
        if (/> Network: /.test(message.toString())) {
          isResolved = true;
          resolve();
        }
      });

      instance.on('exit', (code) => {
        // output.clear();
        // output.hide();
        // output.dispose();
        if (!isResolved) {
          reject(new Error(`Preview exited with code: ${code ?? 'null'}`));
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
      try {
        const editor = vscode.window.activeTextEditor;
        if (editor == null) {
          await vscode.window.showErrorMessage('No active editor');
          return;
        }

        const fileName = editor.document.fileName;
        if (!fileName.endsWith('.vue')) {
          await vscode.window.showErrorMessage('Only .vue files are supported');
          return;
        }

        const existing = Array.from(previewSources.keys()).find((panel) => {
          const info = previewSources.get(panel);
          return info?.fileName === fileName;
        });

        if (existing != null) {
          existing.reveal(vscode.ViewColumn.Beside);
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
        panel.iconPath = vscode.Uri.file(Path.resolve(context.extensionPath, 'logo.png'));
        panel.onDidDispose(() => {
          previewSources.delete(panel);
        });
        panel.onDidChangeViewState(async (event) => {
          if (event.webviewPanel.active) {
            activeWebviewPanel = event.webviewPanel;
          } else if (activeWebviewPanel === event.webviewPanel) {
            activeWebviewPanel = undefined;
          }

          await vscode.commands.executeCommand(
            'setContext',
            'preview:isFocused',
            event.webviewPanel.active
          );
        });
        panel.webview.onDidReceiveMessage(async (event: { command: string; payload: any }) => {
          switch (event.command) {
            case 'alert': {
              await vscode.window.showInformationMessage(event.payload.message);
              break;
            }
          }
        });
        panel.webview.html = getWebviewContent(
          '<div style="display: flex; height: 100%; align-items: center; justify-content: center;">Starting preview...</div>'
        );
        const { instance, output } = await getViteInstance(bin, rootDir, port);
        instance.stdin?.write(JSON.stringify({ command: 'open', arguments: { fileName } }) + '\n');

        const id = Path.relative(rootDir, fileName);
        const uri = `http://localhost:${port}/sandbox?fileName=${encodeURIComponent(id)}`;
        previewSources.set(panel, { fileName, uri });
        output.appendLine(`Preview File: "${fileName}"`);
        output.appendLine(`URL: "${uri}"`);
        panel.webview.html = getWebviewContent(getPreviewIFrame(uri));
      } catch (error) {
        console.error(error);
        await vscode.window.showErrorMessage(error.message);
      }
    }),

    vscode.commands.registerCommand('preview.open', async () => {
      const fileName = getActiveVueFile();
      if (fileName?.endsWith('.vue') !== true) {
        await vscode.window.showErrorMessage('Only .vue files are supported');
        return;
      }

      const rootDir = findProjectDir(fileName);
      const port = await getVitePort(rootDir);
      const { instance, output } = await getViteInstance(bin, rootDir, port);
      instance.stdin?.write(JSON.stringify({ command: 'open', arguments: { fileName } }) + '\n');
      const id = Path.relative(rootDir, fileName);
      const uri = `http://localhost:${port}/sandbox?fileName=${encodeURIComponent(id)}`;
      output.appendLine(`Preview File: "${fileName}"`);
      output.appendLine(`URL: "${uri}"`);
      await vscode.env.openExternal(vscode.Uri.parse(uri));
    }),

    vscode.commands.registerCommand('preview.refresh', async () => {
      if (activeWebviewPanel != null) {
        const info = previewSources.get(activeWebviewPanel);
        if (info != null) {
          activeWebviewPanel.webview.html = getWebviewContent(getPreviewIFrame(info.uri));
        }
      }
    }),

    vscode.commands.registerCommand('preview.update', async () => {
      await installPreview(bin, context, true);
    }),

    vscode.commands.registerCommand('preview.showSource', async () => {
      const fileName = getActiveVueFile();

      if (fileName != null) {
        const editor = vscode.window.visibleTextEditors.find(
          (editor) => editor.document.fileName === fileName
        );
        const options: vscode.TextDocumentShowOptions = {
          viewColumn: vscode.ViewColumn.One,
        };

        if (editor != null) {
          await vscode.window.showTextDocument(editor.document, options);
        } else {
          await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(fileName), options);
        }
      }
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
    await vscode.commands.executeCommand('setContext', 'preview:isViteStarted', false);
  }
}

function getPreviewIFrame(uri: string): string {
  return `
        <iframe style="border: none;" width="100%" height="100%" src="${uri}&t=${Date.now()}&vscode"></iframe>
        `;
}

async function installPreview(
  bin: string,
  context: vscode.ExtensionContext,
  force = false
): Promise<void> {
  if (context.extensionMode === vscode.ExtensionMode.Development) return;
  if (!FS.existsSync(bin) || force) {
    await vscode.window.withProgress(
      {
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
        title: 'Installing @vuedx/preview',
      },
      async (progress, token): Promise<void> => {
        return await new Promise<void>((resolve, reject) => {
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
            output.append(typeof chunk === 'string' ? chunk : JSON.stringify(chunk));
          });
          installation.on('error', (error) => {
            output.appendLine(`Error: ${error.message}`);
            output.appendLine(error.stack ?? '');
          });
          installation.stdout?.on('data', (chunk: Buffer) => {
            output.append(chunk.toString());
            progress.report({ message: chunk.toString() });
          });
          let error: string = '';
          installation.stderr?.on('data', (chunk: Buffer) => {
            output.append(chunk.toString());
            error += chunk.toString();
          });
          installation.on('exit', (code) => {
            if (code !== 0) {
              reject(
                new Error(
                  `Error: npm exited with non-zero status code: ${code ?? 'null'}.\n\n${error}`
                )
              );
            } else {
              resolve();
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
    return JSON.parse(FS.readFileSync(pkgFile, 'utf-8')).name;
  } catch {
    return 'znck.preview';
  }
}


