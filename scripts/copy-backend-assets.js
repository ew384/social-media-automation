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
