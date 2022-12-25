import type { IFileSystemHandler } from "../src/fileSystem";

const moment = require("moment");
const fs = require('fs');
const path = require('path');

export function fileSystemHandler(): IFileSystemHandler {
    return {
        normalizePath: (path: string) => path,
        read: async (path: string) => {
            return fs.readFileSync(path).toString();
        },
        write: async (path: string) => {},
        exists: async (path: string) => true,
        pluginsDir: () => resolvePathToData("plugins")
    }
}

export function resolvePathToData(filePath: string): string {
    return path.resolve(path.join("tests/data", filePath));
}
