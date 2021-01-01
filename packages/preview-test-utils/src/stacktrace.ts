const STACK_LINE_RE = /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;
interface StackTraceLine {
  fileName: string;
  methodName: string;
  arguments: string[];
  line: number;
  column?: number;
}
export function getStackTraceLine(depth: number = 0): StackTraceLine | undefined {
  const error = new Error();
  const lines = (error.stack ?? '').split('\n').map(parseStackTrace).filter(Boolean);
  return lines[depth + 1];
}

function parseStackTrace(trace: string): StackTraceLine | undefined {
  const parts = STACK_LINE_RE.exec(trace);
  if (!parts) return;
  return {
    fileName: parts[2],
    methodName: parts[1] ?? '<unknown>',
    arguments: [],
    line: +parts[3],
    column: parts[4] ? +parts[4] : undefined,
  };
}
