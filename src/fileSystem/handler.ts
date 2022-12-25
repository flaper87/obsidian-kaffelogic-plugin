import * as obsidian from "obsidian";
import type { IFileSystemHandler } from "./interface";
import { promises as fs } from "fs";
import path from "path";

export class FileSystemHandler implements IFileSystemHandler {
	adapter: obsidian.DataAdapter;
	vault: obsidian.Vault;

	constructor(vault: obsidian.Vault) {
		this.vault = vault;
		this.adapter = vault.adapter;
	}

	public normalizePath(path: string): string {
		return obsidian.normalizePath(path);
	}

	public async read(path: string): Promise<string> {
		if (path.startsWith("/")) {
			return await fs.readFile(path, "utf-8");
		}

		return await this.adapter.read(path);
	}

	public async copy(src: string, dst: string): Promise<void> {
		if (!src.startsWith("/")) {
			src = path.join((this.adapter as any).basePath, src);
		}
		if (!dst.startsWith("/")) {
			dst = path.join((this.adapter as any).basePath, dst);
		}
		await fs.copyFile(src, dst);
	}

	public async write(path: string, data: string): Promise<void> {
		await this.adapter.write(path, data);
	}

	public async exists(path: string): Promise<boolean> {
		if (path.startsWith("/")) {
			try {
				await fs.access(path);
				return true;
			} catch {
				return false;
			}
		}
		return await this.adapter.exists(path);
	}

	public pluginsDir(): string {
		return this.normalizePath(`${this.vault.configDir}/plugins`);
	}
}
