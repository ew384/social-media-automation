#!/bin/bash

echo "🔧 设置构建脚本..."

# 创建 scripts 目录
mkdir -p scripts

# 1. 创建后端资源复制脚本
cat > scripts/copy-backend-assets.js << 'EOF'
const fs = require('fs-extra');
const path = require('path');

async function copyBackendAssets() {
  console.log('📁 复制后端资源文件...');

  const backendSrc = path.join(__dirname, '../packages/backend');
  const backendDist = path.join(backendSrc, 'dist');

  try {
    // 确保目标目录存在
    await fs.ensureDir(backendDist);

    // 需要复制的文件和目录
    const assetsToCopy = [
      // 复制 plugins 目录下的 .js 文件（自动化脚本）
      {
        src: path.join(backendSrc, 'src/main/plugins'),
        dest: path.join(backendDist, 'main/plugins'),
        optional: true,
        filter: (src) => {
          // 只复制 .js 文件，跳过 .ts 文件（已经编译了）
          const stat = fs.statSync(src);
          if (stat.isDirectory()) return true;
          return path.extname(src) === '.js';
        }
      },
      // 复制其他脚本文件
      {
        src: path.join(backendSrc, 'scripts'),
        dest: path.join(backendDist, 'scripts'),
        optional: true
      },
      // 复制资源文件
      {
        src: path.join(backendSrc, 'resources'),
        dest: path.join(backendDist, 'resources'),
        optional: true
      }
    ];

    let copiedCount = 0;
    for (const asset of assetsToCopy) {
      if (await fs.pathExists(asset.src)) {
        console.log(`  复制: ${path.relative(backendSrc, asset.src)} -> ${path.relative(backendSrc, asset.dest)}`);
        if (asset.filter) {
          await fs.copy(asset.src, asset.dest, { filter: asset.filter });
        } else {
          await fs.copy(asset.src, asset.dest);
        }
        copiedCount++;
      } else if (!asset.optional) {
        console.warn(`  ⚠️  找不到必需的资源: ${asset.src}`);
      }
    }

    if (copiedCount === 0) {
      console.log('  没有需要复制的资源文件');
    }

    console.log('✅ 后端资源复制完成');
  } catch (error) {
    console.error('❌ 复制后端资源失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  copyBackendAssets();
}

module.exports = copyBackendAssets;
EOF

# 2. 创建主构建脚本
cat > scripts/build.js << 'EOF'
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function buildAll() {
  console.log('🚀 开始构建所有包...');

  try {
    // 1. 构建共享模块
    console.log('\n📦 构建共享模块...');
    execSync('pnpm --filter @sma/shared run build', { stdio: 'inherit' });

    // 2. 构建后端
    console.log('\n🖥️ 构建后端...');
    execSync('pnpm --filter @sma/backend run build', { stdio: 'inherit' });

    // 3. 构建前端
    console.log('\n🎨 构建前端...');
    execSync('pnpm --filter @sma/frontend run build', { stdio: 'inherit' });

    // 4. 构建启动器（如果存在）
    if (await fs.pathExists('packages/launcher')) {
      console.log('\n🚀 构建启动器...');
      execSync('pnpm --filter @sma/launcher run build', { stdio: 'inherit' });
    }

    // 5. 复制资源文件
    console.log('\n📁 整合构建产物...');
    await copyAssets();

    console.log('\n✅ 构建完成！');
  } catch (error) {
    console.error('\n❌ 构建失败:', error.message);
    process.exit(1);
  }
}

async function copyAssets() {
  const distDir = path.join(__dirname, '../dist');
  await fs.ensureDir(distDir);

  // 复制各个包的构建产物到 dist
  const copyTasks = [
    {
      src: 'packages/frontend/dist',
      dest: path.join(distDir, 'frontend'),
      name: '前端'
    },
    {
      src: 'packages/backend/dist',
      dest: path.join(distDir, 'backend'),
      name: '后端'
    },
    {
      src: 'packages/shared/dist',
      dest: path.join(distDir, 'shared'),
      name: '共享模块'
    }
  ];

  // 检查启动器是否存在
  if (await fs.pathExists('packages/launcher/dist')) {
    copyTasks.push({
      src: 'packages/launcher/dist',
      dest: path.join(distDir, 'launcher'),
      name: '启动器'
    });
  }

  for (const task of copyTasks) {
    if (await fs.pathExists(task.src)) {
      console.log(`  复制${task.name}: ${task.src} -> ${path.relative(__dirname + '/..', task.dest)}`);
      await fs.copy(task.src, task.dest);
    } else {
      console.warn(`  ⚠️  ${task.name}构建产物不存在: ${task.src}`);
    }
  }
  
  // 复制资源文件（如果存在）
  if (await fs.pathExists('resources')) {
    console.log('  复制资源文件: resources -> dist/resources');
    await fs.copy('resources', path.join(distDir, 'resources'));
  }
}

if (require.main === module) {
  buildAll();
}

module.exports = { buildAll, copyAssets };
EOF

# 3. 安装必要的依赖到根目录（用于脚本）
echo "📦 安装构建脚本依赖..."
pnpm add -D fs-extra

# 4. 修复后端包的构建配置，使用 pnpm 而不是 npm
echo "🔧 修复后端包的构建脚本..."
cd packages/backend

# 备份原配置
if [ -f "package.json" ]; then
    cp package.json package.json.backup
fi

# 更新 package.json，使用 pnpm 替代 npm
cat > package.json << 'EOF'
{
  "name": "@sma/backend",
  "private": true,
  "version": "1.0.0",
  "description": "Multi-account browser with session isolation for social media automation",
  "main": "./dist/main/main.js",
  "author": "endian wang",
  "license": "MIT",
  "scripts": {
    "build": "tsc && pnpm run copy-assets",
    "copy-assets": "node ../../scripts/copy-backend-assets.js",
    "dev": "concurrently \"tsc -w\" \"wait-on dist/main/main.js && nodemon dist/main/main.js\"",
    "start": "node dist/main/main.js",
    "start:headless": "node dist/main/main.js --headless",
    "start:background": "node dist/main/main.js --background",
    "start:production": "NODE_ENV=production node dist/main/main.js",
    "test": "jest",
    "test:isolation": "pnpm run build && ts-node test/isolation-test.ts",
    "test:api": "pnpm run build && ts-node test/api-test.ts",
    "clean": "rimraf dist"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.8",
    "@types/node": "^20.10.0",
    "@types/socket.io": "^3.0.1",
    "concurrently": "^8.2.2",
    "jest": "^29.7.0",
    "rimraf": "^5.0.5",
    "ts-jest": "^29.1.1",
    "ts-node": "^10.9.1",
    "typescript": "^5.3.0",
    "wait-on": "^7.2.0",
    "nodemon": "^3.0.0"
  },
  "dependencies": {
    "better-sqlite3": "^12.2.0",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "multer": "^2.0.2",
    "socket.io": "^4.8.1",
    "sqlite": "^5.1.1",
    "@sma/shared": "workspace:*"
  }
}
EOF

cd ../..

echo "✅ 构建脚本设置完成！"
echo ""
echo "现在可以运行："
echo "  pnpm run build:backend  # 构建后端"
echo "  pnpm run build          # 构建所有包"