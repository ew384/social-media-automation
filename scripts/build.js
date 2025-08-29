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

    // 4. 构建启动器（如果存在且有源文件）
    if (await fs.pathExists('packages/launcher/src')) {
      try {
        console.log('\n🚀 构建启动器...');
        execSync('pnpm --filter @sma/launcher run build', { stdio: 'inherit' });
      } catch (error) {
        console.warn('\n⚠️ 启动器构建失败，但不影响其他包的构建');
        console.warn('请检查启动器的 TypeScript 配置和源文件');
      }
    } else {
      console.log('\n⏭️ 跳过启动器构建（未找到源文件）');
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
