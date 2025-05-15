#!/usr/bin/env bash

# 确保脚本在出错时停止执行
set -e

# 构建项目（如果有构建步骤）
# npm run build

# 进入输出目录
cd .

# 如果你要部署到自定义域名，请取消下面一行注释并修改为你的域名
# echo 'www.example.com' > CNAME

# 初始化git仓库
git init
git checkout -b gh-pages
git add .
git commit -m "部署到GitHub Pages"

# 如果你要部署到 https://<用户名>.github.io/<仓库名>
git push -f git@github.com:opeensf/pinhaotu.git gh-pages

cd - 