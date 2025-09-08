import { Session, session } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export class SessionManager {
    private sessions: Map<string, Session> = new Map();
    private dataPath: string;
    private sessionPartitions: Map<string, string> = new Map(); // 🔥 新增：记录分区信息
    constructor(dataPath: string) {
        this.dataPath = dataPath;
        this.ensureDataDirectory();
    }

    private ensureDataDirectory(): void {
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
    }
    // 在SessionManager.ts中添加
    getAllSessions(): Session[] {
        return Array.from(this.sessions.values());
    }
    // 在SessionManager.ts中添加调试方法
    getSessionPartitions(): Array<{ accountId: string, partition: string, expectedPath: string }> {
        const userData = require('electron').app.getPath('userData');
        const partitions = [];
        
        for (const [accountId, session] of this.sessions.entries()) {
            try {
                // 🔥 使用记录的分区信息
                const partition = this.sessionPartitions.get(accountId) || 'unknown';
                
                // 🔥 修复：路径计算也要对应调整
                // 从 persist:douyin_Andy0919_1757308547920 转换为 persist_douyin_Andy0919_1757308547920
                const expectedPath = path.join(userData, 'Partitions', partition.replace(':', '_'));
                
                partitions.push({ accountId, partition, expectedPath });
            } catch (error) {
                console.warn(`⚠️ 无法获取Session分区: ${accountId}`);
            }
        }
        
        return partitions;
    }

    // 调试方法：显示所有Session保存路径
    logSessionPaths(): void {
        console.log('📁 Session自动保存路径:');
        const partitions = this.getSessionPartitions();
        
        partitions.forEach(({ accountId, partition, expectedPath }) => {
            console.log(`  ${accountId}`);
            console.log(`    分区: ${partition}`);
            console.log(`    路径: ${expectedPath}`);
            
            // 检查路径是否存在
            if (fs.existsSync(expectedPath)) {
                const files = fs.readdirSync(expectedPath);
                console.log(`    文件: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
            } else {
                console.log(`    ⚠️ 路径暂未生成（可能需要数据写入后才创建）`);
            }
        });
    }
    createIsolatedSession(accountId: string, platform?: string, cookieFile?: string): Session {
        if (this.sessions.has(accountId)) {
            return this.sessions.get(accountId)!;
        }

        let partition: string;

        if (platform && cookieFile) {
            const cookieBasename = path.basename(cookieFile, '.json');
            
            // 🔥 修复：直接使用 cookieBasename，不重复添加 platform
            partition = `persist:${cookieBasename}`;
            console.log(`💾 创建持久化Session: ${partition}`);
            
            // 🔥 数据会自动保存到：
            // userData/Partitions/douyin_Andy0919_1757308547920/
            const userData = require('electron').app.getPath('userData');
            const autoSavePath = path.join(userData, 'Partitions', `${cookieBasename}`);
            console.log(`📁 数据自动保存到: ${autoSavePath}`);
        } else {
            partition = `persist:account-${accountId}`;
        }
        this.sessionPartitions.set(accountId, partition);
        const isolatedSession = session.fromPartition(partition, {
            cache: true
        });

        // 配置Session安全选项
        isolatedSession.setPermissionRequestHandler((webContents, permission, callback) => {
            const allowedPermissions = ['notifications', 'media'];
            callback(allowedPermissions.includes(permission));
        });

        // 设置用户代理
        isolatedSession.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // 移除不必要的预加载脚本
        isolatedSession.setPreloads([]);

        // 注释掉整个 webRequest 拦截
        isolatedSession.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
            delete details.requestHeaders['X-Requested-With'];
            callback({ requestHeaders: details.requestHeaders });
        });

        this.sessions.set(accountId, isolatedSession);
        console.log(`✅ Created isolated session for account: ${accountId}`);

        return isolatedSession;
    }


    getSession(accountId: string): Session | undefined {
        return this.sessions.get(accountId);
    }

    deleteSession(accountId: string): void {
        const session = this.sessions.get(accountId);
        if (session) {
            // 清理Session数据
            session.clearStorageData().catch(console.error);
            this.sessions.delete(accountId);
            console.log(`🗑️ Deleted session for account: ${accountId}`);
        }
    }

    getAllSessionIds(): string[] {
        return Array.from(this.sessions.keys());
    }
}