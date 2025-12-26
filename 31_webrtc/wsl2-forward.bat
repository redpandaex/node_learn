@echo off
chcp 65001 >nul
echo WSL2端口转发脚本
echo ==================

REM 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 请以管理员身份运行此脚本！
    pause
    exit /b 1
)

REM 获取WSL2的IP地址
echo 正在获取WSL2 IP地址...
for /f "tokens=2 delims=:" %%i in ('wsl hostname -I') do set WSL_IP=%%i
set WSL_IP=%WSL_IP: =%

if "%WSL_IP%"=="" (
    echo 无法获取WSL2 IP地址，请确保WSL2正在运行
    pause
    exit /b 1
)

echo WSL2 IP: %WSL_IP%

REM 删除旧规则
echo 清理旧规则...
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0 >nul 2>&1
netsh interface portproxy delete v4tov4 listenport=8080 listenaddress=0.0.0.0 >nul 2>&1

REM 添加端口转发
echo 设置端口转发...
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=%WSL_IP%
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=8080 connectaddress=%WSL_IP%

REM 设置防火墙
echo 设置防火墙规则...
netsh advfirewall firewall delete rule name="WSL2-3000" >nul 2>&1
netsh advfirewall firewall delete rule name="WSL2-8080" >nul 2>&1
netsh advfirewall firewall add rule name="WSL2-3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="WSL2-8080" dir=in action=allow protocol=TCP localport=8080

echo 完成！现在可以通过局域网IP访问服务了
echo 当前转发规则:
netsh interface portproxy show v4tov4

pause