@echo off
chcp 936 >nul
cd /d "%~dp0"
title 硕士工作台·本地桥接服务
echo ========================================
echo   硕士工作台 · 本地桥接服务启动器
echo   请保持本窗口开启（可最小化），
echo   关闭窗口后网页将无法调用本地软件。
echo ========================================
echo.
where node >nul 2>nul
if not errorlevel 1 (
  node server.cjs
) else (
  echo [错误] 未检测到 Node.js 环境。
  echo 请先安装 Node.js（https://nodejs.org）后重试。
  echo.
  pause
)
