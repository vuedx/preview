const STACK_LINE_RE =
  /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;
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
    fileName: String(parts[2]),
    methodName: parts[1] ?? '<unknown>',
    arguments: [],
    line: parts[3] != null ? parseInt(parts[3]) : 0,
    column: parts[4] != null ? parseInt(parts[4]) : undefined,
  };
}
