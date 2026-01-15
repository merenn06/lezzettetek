#!/bin/bash
# Production 502 Hatası Tespit ve Düzeltme Scripti
# Bu script'i production sunucusunda çalıştırın

echo "=========================================="
echo "1. PM2 Process Durumu"
echo "=========================================="
pm2 ls
echo ""

echo "=========================================="
echo "2. PM2 Logları (Son 200 satır)"
echo "=========================================="
pm2 logs lezzettetek --lines 200 --nostream
echo ""

echo "=========================================="
echo "3. Port Dinleme Durumu"
echo "=========================================="
ss -lntp | grep -E ':(3000|8080|80|443)\b' || echo "Port bulunamadı"
echo ""

echo "=========================================="
echo "4. Nginx Error Log (Son 200 satır)"
echo "=========================================="
sudo tail -n 200 /var/log/nginx/error.log
echo ""

echo "=========================================="
echo "5. Nginx Access Log (Son 200 satır)"
echo "=========================================="
sudo tail -n 200 /var/log/nginx/access.log
echo ""

echo "=========================================="
echo "6. Local Healthcheck"
echo "=========================================="
curl -I http://127.0.0.1:3000 2>&1 || echo "Local healthcheck başarısız"
echo ""

echo "=========================================="
echo "7. Nginx Config (Upstream Port)"
echo "=========================================="
sudo grep -A 5 "upstream" /etc/nginx/sites-enabled/* 2>/dev/null || echo "Nginx config bulunamadı"
echo ""

echo "=========================================="
echo "8. Node Process Durumu"
echo "=========================================="
ps aux | grep -E "(node|next)" | grep -v grep
echo ""

echo "=========================================="
echo "9. Disk Space"
echo "=========================================="
df -h
echo ""

echo "=========================================="
echo "10. Memory Usage"
echo "=========================================="
free -h 2>/dev/null || vm_stat
echo ""
