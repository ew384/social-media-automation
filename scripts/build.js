const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function buildAll() {
  console.log('🚀 开始构建自媒体自动化运营系统...');

  try {
    // 1. 构建共享模块
    console.log('\n📦 构建共享模块...');
    execSync('npm --workspace=@sma/shared run build', { stdio: 'inherit' });

    // 2. 构建前端网站
    console.log('\n🎨 构建前端网站...');
    execSync('npm --workspace=@sma/frontend run build', { stdio: 'inherit' });

    // 3. 构建后端浏览器
    console.log('\n🖥️ 构建后端浏览器...');
    execSync('npm --workspace=@sma/backend run build', { stdio: 'inherit' });

    // 4. 整合构建产物
    console.log('\n📁 整合构建产物...');
    await integrateBuildOutput();

    // 5. 验证构建结果
    console.log('\n🔍 验证构建结果...');
    await validateBuild();

    console.log('\n✅ 构建完成！');
    console.log('\n📋 下一步：');
    console.log('   开发测试: npm run start');
    console.log('   打包应用: npm run package:mac');
    
  } catch (error) {
    console.error('\n❌ 构建失败:', error.message);
    process.exit(1);
  }
}

async function integrateBuildOutput() {
  const distDir = path.join(__dirname, '../dist');
  await fs.ensureDir(distDir);

  // 整合构建产物的任务列表
  const integrationTasks = [
    {
      src: 'packages/frontend/dist',
      dest: path.join(distDir, 'frontend'),
      name: '前端网站',
      required: true
    },
    {
      src: 'packages/backend/dist',
      dest: path.join(distDir, 'backend'),
      name: '后端浏览器',
      required: true
    },
    {
      src: 'packages/shared/dist',
      dest: path.join(distDir, 'shared'),
      name: '共享模块',
      required: true
    }
  ];

  for (const task of integrationTasks) {
    if (await fs.pathExists(task.src)) {
      console.log(`  ✅ 整合${task.name}: ${task.src} -> ${path.relative(__dirname + '/..', task.dest)}`);
      await fs.copy(task.src, task.dest);
    } else if (task.required) {
      throw new Error(`必需的构建产物不存在: ${task.src}`);
    } else {
      console.warn(`  ⚠️  可选的构建产物不存在: ${task.src}`);
    }
  }
  
  // 复制资源文件
  if (await fs.pathExists('resources')) {
    console.log('  📄 复制资源文件: resources -> dist/resources');
    await fs.copy('resources', path.join(distDir, 'resources'));
  }

  // 创建启动配置文件
  await createLaunchConfig(distDir);
}

async function createLaunchConfig(distDir) {
  const launchConfig = {
    name: '自媒体自动化运营系统',
    version: '1.0.0',
    backend: {
      entry: 'backend/main/main.js',
      port: 5409
    },
    frontend: {
      path: 'frontend',
      url: 'http://localhost:5173',
      port: 5173
    },
    autoOpenConfig: true,
    configTabName: '自动化配置中心'
  };

  const configPath = path.join(distDir, 'launch-config.json');
  await fs.writeJson(configPath, launchConfig, { spaces: 2 });
  console.log('  ⚙️  创建启动配置: launch-config.json');
}

async function validateBuild() {
  const requiredFiles = [
    'dist/backend/main/main.js',
    'dist/frontend/index.html',
    'dist/shared/index.js',
    'dist/launch-config.json'
  ];

  const issues = [];
  
  for (const file of requiredFiles) {
    const fullPath = path.join(__dirname, '../', file);
    if (!(await fs.pathExists(fullPath))) {
      issues.push(`缺失文件: ${file}`);
    }
  }

  if (issues.length > 0) {
    console.error('\n❌ 构建验证失败:');
    issues.forEach(issue => console.error(`   ${issue}`));
    throw new Error('构建产物不完整');
  }

  console.log('   ✅ 所有必需文件都存在');
  
  // 检查文件大小
  const backendSize = (await fs.stat(path.join(__dirname, '../dist/backend/main/main.js'))).size;
  const frontendSize = await getFolderSize(path.join(__dirname, '../dist/frontend'));
  
  console.log(`   📊 后端大小: ${formatBytes(backendSize)}`);
  console.log(`   📊 前端大小: ${formatBytes(frontendSize)}`);
}

async function getFolderSize(folder) {
  let size = 0;
  const files = await fs.readdir(folder);
  
  for (const file of files) {
    const filePath = path.join(folder, file);
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      size += await getFolderSize(filePath);
    } else {
      size += stats.size;
    }
  }
  
  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

if (require.main === module) {
  buildAll();
}

module.exports = { buildAll };