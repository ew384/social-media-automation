#!/bin/bash

echo "修复 Electron 类型定义问题..."

# 1. 为后端添加 Electron 类型定义
echo "添加 @types/electron 到后端项目..."
cd packages/backend
pnpm add -D @types/electron
cd ../..

# 2. 更新后端的 package.json 确保包含所有必要的类型
cat > packages/backend/package.json << 'EOF'
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
    "dev": "concurrently \"tsc -w\" \"wait-on dist/main/main.js && electron dist/main/main.js\"",
    "start": "electron dist/main/main.js",
    "start:headless": "electron dist/main/main.js --headless",
    "start:background": "electron dist/main/main.js --background",
    "start:production": "NODE_ENV=production electron dist/main/main.js",
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
    "@types/electron": "^1.6.10",
    "concurrently": "^8.2.2",
    "jest": "^29.7.0",
    "rimraf": "^5.0.5",
    "ts-jest": "^29.1.1",
    "ts-node": "^10.9.1",
    "typescript": "^5.3.0",
    "wait-on": "^7.2.0",
    "electron": "^37.2.1"
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

# 3. 更新后端的 TypeScript 配置以包含 electron 类型
cat > packages/backend/tsconfig.json << 'EOF'
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "lib": [
            "ES2020",
            "DOM"
        ],
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "moduleResolution": "node",
        "allowSyntheticDefaultImports": true,
        "resolveJsonModule": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "types": ["node", "electron"]
    },
    "include": [
        "src/**/*.ts"
    ],
    "exclude": [
        "node_modules",
        "dist",
        "test"
    ]
}
EOF

# 4. 重新安装后端依赖
echo "重新安装后端依赖..."
cd packages/backend
pnpm install
cd ../..

# 5. 重新构建
echo "重新构建后端..."
pnpm run build:backend

echo "修复完成！"