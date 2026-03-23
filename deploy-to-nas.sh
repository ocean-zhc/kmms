#!/bin/bash
#
# 幼儿园食谱管理系统 - NAS部署脚本
#
# 用法:
#   ./deploy-to-nas.sh              # 仅构建镜像并导出
#   ./deploy-to-nas.sh user@nas-ip  # 构建+上传+部署到NAS
#
# 前置条件:
#   1. 本机安装 Docker
#   2. NAS 开启 SSH 并安装 Docker Compose
#   3. PG 数据库已初始化 (192.168.1.3:5432)
#

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
NAS_TARGET="$1"
NAS_DEPLOY_DIR="/volume1/docker/kmms"  # NAS上的部署目录，按需修改
OUTPUT_DIR="$PROJECT_DIR/deploy/output"

echo "========================================="
echo " 幼儿园食谱管理系统 - Docker 部署"
echo "========================================="

# 1. 构建前端
echo ""
echo "[1/4] 构建前端..."
cd "$PROJECT_DIR/web"
npx umi build 2>&1 | tail -3

# 2. 构建 Docker 镜像
echo ""
echo "[2/4] 构建 Docker 镜像..."
cd "$PROJECT_DIR"
docker build -f Dockerfile.api -t kmms-api:latest .
docker build -f Dockerfile.web -t kmms-web:latest .

# 3. 导出镜像
echo ""
echo "[3/4] 导出镜像..."
mkdir -p "$OUTPUT_DIR"
docker save kmms-api:latest | gzip > "$OUTPUT_DIR/kmms-api.tar.gz"
docker save kmms-web:latest | gzip > "$OUTPUT_DIR/kmms-web.tar.gz"

# 复制 docker-compose.yml
cp "$PROJECT_DIR/docker-compose.yml" "$OUTPUT_DIR/docker-compose.yml"

# 生成NAS用的docker-compose（用image而非build）
cat > "$OUTPUT_DIR/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  api:
    image: kmms-api:latest
    container_name: kmms-api
    restart: unless-stopped
    environment:
      - TZ=Asia/Shanghai
    networks:
      - kmms

  web:
    image: kmms-web:latest
    container_name: kmms-web
    restart: unless-stopped
    ports:
      - "8000:80"
    depends_on:
      - api
    environment:
      - TZ=Asia/Shanghai
    networks:
      - kmms

networks:
  kmms:
    driver: bridge
EOF

echo "镜像已导出到: $OUTPUT_DIR/"
ls -lh "$OUTPUT_DIR/"

# 4. 上传到NAS（如果提供了目标地址）
if [ -n "$NAS_TARGET" ]; then
    echo ""
    echo "[4/4] 上传到NAS: $NAS_TARGET:$NAS_DEPLOY_DIR ..."
    ssh "$NAS_TARGET" "mkdir -p $NAS_DEPLOY_DIR"
    scp "$OUTPUT_DIR/kmms-api.tar.gz" "$NAS_TARGET:$NAS_DEPLOY_DIR/"
    scp "$OUTPUT_DIR/kmms-web.tar.gz" "$NAS_TARGET:$NAS_DEPLOY_DIR/"
    scp "$OUTPUT_DIR/docker-compose.yml" "$NAS_TARGET:$NAS_DEPLOY_DIR/"

    echo ""
    echo "文件已上传，SSH到NAS执行以下命令启动："
    echo ""
    echo "  ssh $NAS_TARGET"
    echo "  cd $NAS_DEPLOY_DIR"
    echo "  docker load < kmms-api.tar.gz"
    echo "  docker load < kmms-web.tar.gz"
    echo "  docker compose up -d"
    echo ""
else
    echo ""
    echo "[4/4] 跳过上传（未指定NAS地址）"
    echo ""
    echo "========================================="
    echo " 手动部署步骤："
    echo "========================================="
    echo ""
    echo " 1. 将以下文件复制到NAS:"
    echo "    $OUTPUT_DIR/kmms-api.tar.gz"
    echo "    $OUTPUT_DIR/kmms-web.tar.gz"
    echo "    $OUTPUT_DIR/docker-compose.yml"
    echo ""
    echo " 2. SSH到NAS，执行:"
    echo "    mkdir -p $NAS_DEPLOY_DIR && cd $NAS_DEPLOY_DIR"
    echo "    docker load < kmms-api.tar.gz"
    echo "    docker load < kmms-web.tar.gz"
    echo "    docker compose up -d"
    echo ""
    echo " 3. 访问: http://NAS-IP:8000"
    echo "    管理后台: http://NAS-IP:8000/admin/login"
    echo "    账号: admin / admin123"
    echo ""
fi

echo "========================================="
echo " 部署完成！"
echo "========================================="
