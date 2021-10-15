
export interface FileSystemHost {
  exists(fileName: string): Promise<boolean>;
  readFile(fileName: string): Promise<string>;
}
