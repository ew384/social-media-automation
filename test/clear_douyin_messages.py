#!/usr/bin/env python3
"""
清空抖音平台全部用户历史消息数据脚本
支持安全删除，包含备份选项和详细日志
"""

import sqlite3
import json
import os
import shutil
from datetime import datetime
import sys

# 导入配置
from config import Config, BASE_DIR, DB_PATH, PLATFORM_TYPE_MAP, get_platform_name

def create_backup():
    """创建数据库备份"""
    try:
        backup_dir = os.path.join(BASE_DIR, "backups")
        os.makedirs(backup_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(backup_dir, f"database_backup_{timestamp}.db")
        
        print(f"🔄 正在创建数据库备份...")
        print(f"   原文件: {DB_PATH}")
        print(f"   备份至: {backup_path}")
        
        shutil.copy2(DB_PATH, backup_path)
        
        print(f"✅ 备份创建成功!")
        return backup_path
    except Exception as e:
        print(f"❌ 创建备份失败: {e}")
        return None

def get_douyin_statistics():
    """获取抖音平台数据统计"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 统计抖音线程数量
        cursor.execute("""
            SELECT COUNT(*) as thread_count 
            FROM message_threads 
            WHERE platform = 'douyin'
        """)
        thread_count = cursor.fetchone()['thread_count']
        
        # 统计抖音消息数量
        cursor.execute("""
            SELECT COUNT(*) as message_count 
            FROM messages m
            JOIN message_threads t ON m.thread_id = t.id
            WHERE t.platform = 'douyin'
        """)
        message_count = cursor.fetchone()['message_count']
        
        # 获取抖音账号列表
        cursor.execute("""
            SELECT DISTINCT account_id, COUNT(*) as thread_count
            FROM message_threads 
            WHERE platform = 'douyin'
            GROUP BY account_id
            ORDER BY thread_count DESC
        """)
        accounts = cursor.fetchall()
        
        # 获取抖音用户列表
        cursor.execute("""
            SELECT user_id, user_name, COUNT(*) as thread_count,
                   MAX(last_message_time) as last_message
            FROM message_threads 
            WHERE platform = 'douyin'
            GROUP BY user_id, user_name
            ORDER BY thread_count DESC
            LIMIT 10
        """)
        users = cursor.fetchall()
        
        return {
            'thread_count': thread_count,
            'message_count': message_count,
            'accounts': accounts,
            'users': users
        }
        
    except sqlite3.Error as e:
        print(f"❌ 获取统计信息失败: {e}")
        return None
    finally:
        if conn:
            conn.close()

def print_douyin_statistics(stats):
    """打印抖音平台统计信息"""
    if not stats:
        return
    
    print("📊 抖音平台数据统计:")
    print(f"   消息线程数量: {stats['thread_count']}")
    print(f"   历史消息数量: {stats['message_count']}")
    
    if stats['accounts']:
        print(f"   账号列表 ({len(stats['accounts'])}个):")
        for account in stats['accounts']:
            print(f"     • {account['account_id']} ({account['thread_count']} 个对话)")
    
    if stats['users']:
        print(f"   主要用户 (前10个):")
        for user in stats['users']:
            print(f"     • {user['user_name']} (ID: {user['user_id']}) - {user['thread_count']} 个对话")
    
    print("-" * 60)

def delete_douyin_messages():
    """删除抖音平台的所有消息数据"""
    try:
        conn = sqlite3.connect(DB_PATH, isolation_level=None)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        cursor = conn.cursor()
        
        print("🗑️  开始删除抖音平台消息数据...")
        
        # 开启事务
        cursor.execute("BEGIN TRANSACTION;")
        
        try:
            # 1. 删除抖音平台的消息记录
            cursor.execute("""
                DELETE FROM messages 
                WHERE thread_id IN (
                    SELECT id FROM message_threads WHERE platform = 'douyin'
                )
            """)
            deleted_messages = cursor.rowcount
            print(f"   ✅ 删除消息记录: {deleted_messages} 条")
            
            # 2. 删除抖音平台的消息线程
            cursor.execute("""
                DELETE FROM message_threads 
                WHERE platform = 'douyin'
            """)
            deleted_threads = cursor.rowcount
            print(f"   ✅ 删除消息线程: {deleted_threads} 个")
            
            # 3. 清理抖音平台的同步状态
            cursor.execute("""
                DELETE FROM platform_sync_status 
                WHERE platform = 'douyin'
            """)
            deleted_sync_status = cursor.rowcount
            print(f"   ✅ 清理同步状态: {deleted_sync_status} 个")
            
            # 提交事务
            cursor.execute("COMMIT;")
            
            print("✅ 抖音平台数据删除完成!")
            return {
                'messages': deleted_messages,
                'threads': deleted_threads,
                'sync_status': deleted_sync_status
            }
            
        except Exception as e:
            # 回滚事务
            cursor.execute("ROLLBACK;")
            raise e
            
    except sqlite3.Error as e:
        print(f"❌ 删除数据失败: {e}")
        return None
    finally:
        if conn:
            conn.close()

def clean_message_images():
    """清理抖音相关的消息图片文件"""
    try:
        from config import Config
        message_images_dir = Config.get_message_images_dir()
        
        if not os.path.exists(message_images_dir):
            print("📁 消息图片目录不存在，跳过清理")
            return 0
        
        print(f"🧹 清理消息图片目录: {message_images_dir}")
        
        deleted_count = 0
        # 这里可以根据实际的文件命名规则来删除抖音相关的图片
        # 由于不确定具体的文件命名规则，这里提供一个通用的清理逻辑
        
        for root, dirs, files in os.walk(message_images_dir):
            for file in files:
                # 可以根据文件名模式来判断是否为抖音相关文件
                # 例如：如果文件名包含 'douyin' 或特定模式
                if 'douyin' in file.lower():
                    file_path = os.path.join(root, file)
                    try:
                        os.remove(file_path)
                        deleted_count += 1
                        print(f"   删除文件: {file}")
                    except OSError as e:
                        print(f"   删除文件失败 {file}: {e}")
        
        print(f"✅ 清理图片文件: {deleted_count} 个")
        return deleted_count
        
    except Exception as e:
        print(f"❌ 清理图片文件失败: {e}")
        return 0

def vacuum_database():
    """优化数据库，回收空间"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        print("🔧 正在优化数据库...")
        cursor.execute("VACUUM;")
        print("✅ 数据库优化完成")
        
    except sqlite3.Error as e:
        print(f"❌ 数据库优化失败: {e}")
    finally:
        if conn:
            conn.close()

def main():
    """主函数"""
    print("🚀 抖音平台消息数据清理工具")
    print("=" * 60)
    
    # 检查数据库文件是否存在
    if not os.path.exists(DB_PATH):
        print(f"❌ 数据库文件不存在: {DB_PATH}")
        return
    
    print(f"🔍 数据库路径: {DB_PATH}")
    print(f"🔍 基础目录: {BASE_DIR}")
    
    # 获取当前抖音平台统计
    print("\n📊 获取当前数据统计...")
    stats = get_douyin_statistics()
    
    if not stats:
        print("❌ 无法获取统计信息，程序退出")
        return
    
    print_douyin_statistics(stats)
    
    # 如果没有抖音数据，直接退出
    if stats['thread_count'] == 0 and stats['message_count'] == 0:
        print("✅ 抖音平台没有数据需要清理")
        return
    
    # 确认操作
    print("⚠️  警告: 此操作将永久删除抖音平台的所有消息数据!")
    print(f"   将要删除: {stats['message_count']} 条消息, {stats['thread_count']} 个对话线程")
    
    while True:
        confirm = input("\n是否继续? 输入 'YES' 确认，'NO' 取消: ").strip()
        if confirm.upper() == 'YES':
            break
        elif confirm.upper() == 'NO':
            print("👋 操作已取消")
            return
        else:
            print("❌ 请输入 'YES' 或 'NO'")
    
    # 询问是否创建备份
    while True:
        backup_choice = input("\n是否创建数据库备份? 推荐选择 'Y' (Y/N): ").strip().upper()
        if backup_choice in ['Y', 'YES']:
            backup_path = create_backup()
            if not backup_path:
                print("❌ 备份失败，建议终止操作")
                return
            break
        elif backup_choice in ['N', 'NO']:
            print("⚠️  跳过备份，继续执行删除操作")
            break
        else:
            print("❌ 请输入 'Y' 或 'N'")
    
    print("\n" + "=" * 60)
    print("🗑️  开始执行删除操作...")
    
    # 执行删除
    delete_result = delete_douyin_messages()
    
    if delete_result:
        print(f"\n📋 删除结果汇总:")
        print(f"   删除消息: {delete_result['messages']} 条")
        print(f"   删除线程: {delete_result['threads']} 个")
        print(f"   清理同步状态: {delete_result['sync_status']} 个")
        
        # 清理相关图片文件
        print(f"\n🧹 清理相关文件...")
        cleaned_images = clean_message_images()
        
        # 优化数据库
        print(f"\n🔧 优化数据库...")
        vacuum_database()
        
        # 显示最终统计
        print(f"\n📊 验证删除结果...")
        final_stats = get_douyin_statistics()
        if final_stats:
            print(f"   剩余抖音消息线程: {final_stats['thread_count']}")
            print(f"   剩余抖音历史消息: {final_stats['message_count']}")
        
        if final_stats and (final_stats['thread_count'] == 0 and final_stats['message_count'] == 0):
            print("✅ 抖音平台数据清理完成! 所有相关数据已被删除")
        else:
            print("⚠️  清理可能不完整，请检查数据库")
    else:
        print("❌ 删除操作失败")
    
    print("\n" + "=" * 60)
    print("🏁 程序执行完成")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️  操作被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 程序执行出错: {e}")
        sys.exit(1)