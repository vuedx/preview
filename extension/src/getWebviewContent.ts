// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference lib="dom" />

export interface EventData {
  kind: 'event';
  payload: {
    type: 'keyup' | 'keydown';
    init: KeyboardEventInit;
  };
}

export function getWebviewContent(body: string): string {
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
(${function () {
    window.addEventListener(
      'message',

      (event: MessageEvent<EventData>) => {
        const { kind, payload } = event.data;

        if (kind === 'event') {
          if (payload.type.startsWith('key')) {
            window.dispatchEvent(new KeyboardEvent(payload.type, payload.init));
          }
        }
      },
      false
    );

    function setTheme(): void {
      const classList = document.body.classList;
      const colorScheme = classList.contains('vscode-light') ? 'light' : 'dark';
      const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe');
      iframes.forEach((iframe) => {
        iframe.contentWindow?.postMessage(
          { source: 'vscode', command: 'setTheme', args: { colorScheme } },
          '*'
        );
      });
    }

    setTheme();

    const themeObserver = new MutationObserver(() => setTheme());
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }.toString()})();
</script>
</body>
</html>`;
}
