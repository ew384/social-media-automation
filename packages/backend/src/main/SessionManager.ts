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

    createIsolatedSession(accountId: string, platform?: string, cookieFile?: string): Session {
        // 🔥 直接基于 partition 进行复用管理
        let partition: string;
        
        if (platform && cookieFile) {
            const cookieBasename = path.basename(cookieFile, '.json');
            partition = `persist:${cookieBasename}`;
        } else if (platform === 'frontend') {
            partition = `persist:frontend`;
        } else {
            partition = `temp-${accountId}`;  // 只有临时session才用accountId
        }
        
        // 🔥 直接基于 partition 复用
        //if (this.sessions.has(partition)) {
        //    console.log(`🔄 复用Session: ${partition} for ${accountId}`);
        //    return this.sessions.get(partition)!;
        //}
        
        console.log(`🆕 创建Session: ${partition} for ${accountId}`);
        
        const isolatedSession = session.fromPartition(partition, {
            cache: !partition.startsWith('temp-')
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
        this.sessions.set(partition, isolatedSession);
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