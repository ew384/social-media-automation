import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export class AssetManager {
    private static instance: AssetManager;
    private assetsPath: string;

    private constructor() {
        if (app.isPackaged) {
            // 生产环境：使用 extraResources
            this.assetsPath = path.join(process.resourcesPath, 'assets');
        } else {
            // 开发环境：从 dist/main 目录向上找到项目根目录的 assets
            // dist/main -> dist -> backend -> packages -> 项目根目录 -> packages/backend/assets
            this.assetsPath = path.join(__dirname, '../../../../packages/backend/assets');
        }
        
        console.log('🔍 AssetManager 初始化:');
        console.log('🔍 app.isPackaged:', app.isPackaged);
        console.log('🔍 __dirname:', __dirname);
        console.log('🔍 计算的 assetsPath:', this.assetsPath);
        console.log('🔍 assetsPath 是否存在:', fs.existsSync(this.assetsPath));
        
        // 如果路径不存在，尝试其他可能的路径
        if (!fs.existsSync(this.assetsPath)) {
            const alternatePaths = [
                path.join(__dirname, '../../../assets'),              // dist/main -> assets
                path.join(__dirname, '../../assets'),                 // dist -> assets  
                path.join(__dirname, '../assets'),                    // main -> assets
                path.join(process.cwd(), 'packages/backend/assets'),  // 从工作目录
                path.join(process.cwd(), 'assets')                    // 项目根目录assets
            ];
            
            for (const alternatePath of alternatePaths) {
                console.log('🔍 尝试备用路径:', alternatePath);
                if (fs.existsSync(alternatePath)) {
                    this.assetsPath = alternatePath;
                    console.log('✅ 找到可用路径:', alternatePath);
                    break;
                }
            }
        }
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
        const fullPath = path.join(this.assetsPath, filename);
        const exists = fs.existsSync(fullPath);
        console.log(`🔍 检查文件 ${filename}: ${fullPath} - 存在: ${exists}`);
        return exists;
    }
}