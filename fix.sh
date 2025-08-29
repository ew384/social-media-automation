#!/bin/bash

echo "🔧 修复 Electron 安装问题..."

# 1. 停止所有相关进程
echo "⏹️ 停止相关进程..."
pkill -f "electron" 2>/dev/null || true
pkill -f "node.*dist/main/main.js" 2>/dev/null || true

# 2. 完全清理 Electron 相关文件
echo "🧹 清理 Electron 缓存和文件..."
rm -rf node_modules/.pnpm/electron*
rm -rf ~/.cache/electron
rm -rf ~/.electron
rm -rf ~/.pnpm-store
rm -rf node_modules
rm -rf packages/*/node_modules
rm -rf pnpm-lock.yaml

# 3. 清理系统级 Electron 缓存
echo "🗑️ 清理系统缓存..."
if [ -d "$HOME/.cache/electron" ]; then
    rm -rf "$HOME/.cache/electron"
fi
if [ -d "$HOME/Library/Caches/electron" ]; then
    rm -rf "$HOME/Library/Caches/electron"
fi

# 4. 设置网络相关环境变量（解决下载问题）
echo "🌐 配置网络环境..."
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_CUSTOM_DIR="32.3.3"
export ELECTRON_CACHE="$HOME/.cache/electron"

# 5. 创建缓存目录
mkdir -p "$HOME/.cache/electron"

# 6. 更新 .npmrc 配置（如果使用 pnpm）
echo "📝 配置 pnpm 设置..."
cat > .npmrc << 'EOF'
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
python=/usr/bin/python3
registry=https://registry.npmmirror.com/
EOF

# 7. 重新安装依赖
echo "📦 重新安装依赖..."
pnpm install --no-frozen-lockfile

# 8. 如果仍然失败，尝试手动安装 Electron
if [ $? -ne 0 ]; then
    echo "⚠️ pnpm 安装失败，尝试手动修复 Electron..."
    
    # 删除特定的 electron 包
    rm -rf node_modules/.pnpm/electron*
    
    # 单独安装 electron
    echo "🔨 单独安装 Electron..."
    pnpm add -D electron@32.3.3
    
    # 验证安装
    if [ ! -f "node_modules/.pnpm/electron@32.3.3/node_modules/electron/dist/electron" ] && 
       [ ! -f "node_modules/.pnpm/electron@32.3.3/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" ]; then
        echo "❌ Electron 二进制文件未找到，尝试强制重新下载..."
        
        # 强制重新下载 Electron
        pnpm remove electron
        ELECTRON_CACHE="" pnpm add -D electron@32.3.3 --force
    fi
fi

# 9. 验证 Electron 安装
echo "✅ 验证 Electron 安装..."
if pnpm exec electron --version; then
    echo "🎉 Electron 安装成功！版本: $(pnpm exec electron --version)"
else
    echo "❌ Electron 验证失败，尝试最后的修复方案..."
    
    # 最后的修复尝试：完全重新安装
    rm -rf node_modules
    pnpm store prune
    
    # 使用 npm 临时安装 Electron（作为后备方案）
    if command -v npm &> /dev/null; then
        echo "🔄 使用 npm 作为后备方案安装 Electron..."
        npm install electron@32.3.3 --save-dev --no-package-lock
        
        # 将 npm 安装的 electron 复制到 pnpm 结构中
        if [ -d "node_modules/electron" ]; then
            mkdir -p "node_modules/.pnpm/electron@32.3.3/node_modules/"
            cp -r "node_modules/electron" "node_modules/.pnpm/electron@32.3.3/node_modules/"
        fi
    fi
    
    # 重新安装其他依赖
    pnpm install --no-frozen-lockfile
fi

# 10. 测试后端构建
echo "🧪 测试后端构建..."
cd packages/backend
if [ -f "src/main/main.ts" ]; then
    pnpm run build
    if [ $? -eq 0 ]; then
        echo "✅ 后端构建成功"
    else
        echo "❌ 后端构建失败"
    fi
else
    echo "⚠️ 后端源码文件不存在，跳过构建测试"
fi
cd ../..

# 11. 最终验证
echo "🔍 最终验证..."
echo "Node.js 版本: $(node --version)"
echo "pnpm 版本: $(pnpm --version)"
echo "Electron 版本: $(pnpm exec electron --version 2>/dev/null || echo '未安装或损坏')"

echo ""
echo "🎯 修复完成！现在可以尝试运行："
echo "  pnpm run dev:backend"
echo ""
echo "如果仍有问题，请查看："
echo "  1. 检查网络连接"
echo "  2. 确认防火墙设置"
echo "  3. 考虑使用 VPN 或代理"