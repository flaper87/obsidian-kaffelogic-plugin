import type {IFileSystemHandler} from "../src/fileSystem";
import manifest from "../manifest.json";
import {promises as fsPromise} from 'fs';
import fs from 'fs';
import path from "path";

import {IKLLog, KLLog} from "../src/kaffelogic"

export function klLogManagerForData(log: string): IKLLog {
  let path = resolvePathToData(log);
  const data: Map<string, any> = new Map();
  const histogramData: Map<string, Array<any>> = new Map();

  return {
    histogramData: histogramData, data: data, title: log, file: path,
        import_and_read: async(): Promise<string> => {
          return await fsPromise.readFile(path, 'utf-8');
        }, parse: KLLog.prototype.parse,
  }
}

export function fileSystemHandler(): IFileSystemHandler {
  return {
    normalizePath: (
        path: string) => path,
              read: async (
                  path: string) => { return fs.readFileSync(path).toString(); },
              write: async (path: string) => {},
              exists: async (path: string) => true,
              pluginsDir: () => resolvePathToData("plugins")
  }
}

export function resolvePathToData(filePath: string): string {
  return path.resolve(path.join("tests/data", filePath));
}
