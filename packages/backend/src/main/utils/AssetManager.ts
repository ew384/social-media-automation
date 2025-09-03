import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export class AssetManager {
    private static instance: AssetManager;
    private assetsPath: string;

    private constructor() {
        this.assetsPath = app.isPackaged 
            ? path.join(process.resourcesPath, 'assets')
            : path.join(__dirname, '../../../packages/backend/assets');
    }

    public static getInstance(): AssetManager {
        if (!AssetManager.instance) {
            AssetManager.instance = new AssetManager();
        }
        return AssetManager.instance;
    }

    public getIconPath(): string {
        return path.join(this.assetsPath, 'icon.png');
    }

    public getTrayIconPath(): string {
        return path.join(this.assetsPath, 'tray-icon.png');
    }

    public assetExists(filename: string): boolean {
        return fs.existsSync(path.join(this.assetsPath, filename));
    }
}