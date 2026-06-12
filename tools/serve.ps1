# =====================================================================
# 依存ゼロの簡易静的サーバー（Windows PowerShell 用）
# ---------------------------------------------------------------------
# Node.js も Python も無くても、このスクリプトだけでローカル確認できます。
#
#   使い方:
#     powershell -ExecutionPolicy Bypass -File tools\serve.ps1
#   ブラウザで http://localhost:5500 を開く
#
#   ポートを変える:
#     powershell -ExecutionPolicy Bypass -File tools\serve.ps1 -Port 8080
# =====================================================================

param(
  [int]$Port = 5500,
  [string]$Root = ""   # 配信ルートの上書き（プロジェクトルートからの相対 or 絶対）
)

$ErrorActionPreference = "Stop"

# PowerShell の変数名は大文字小文字を区別しないため、後続の $root 代入で
# param の $Root が潰される。先に退避しておく。
$rootOverride = $Root

# 配信ルート = このスクリプトの 1 つ上（プロジェクトルート）
# $PSScriptRoot が空になる起動方法（ランチャー経由など）にも対応してフォールバック
$scriptDir = $PSScriptRoot
if (-not $scriptDir -and $MyInvocation.MyCommand.Path) {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if ($scriptDir) {
  $root = Split-Path -Parent $scriptDir
} else {
  $root = (Get-Location).Path
}
if (-not $root) { $root = (Get-Location).Path }
# -Root 指定があればそちらを優先（相対ならプロジェクトルート基準）
if ($rootOverride) {
  if ([System.IO.Path]::IsPathRooted($rootOverride)) { $root = $rootOverride }
  else { $root = Join-Path $root $rootOverride }
}
Write-Host "解決した配信ルート: $root"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".htm"  = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".mjs"  = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".md"   = "text/markdown; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif"
  ".webp" = "image/webp"
  ".ico"  = "image/x-icon"
  ".woff" = "font/woff"
  ".woff2" = "font/woff2"
  ".txt"  = "text/plain; charset=utf-8"
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Rayshift Academy を配信中: $prefix" -ForegroundColor Magenta
Write-Host "配信ルート: $root"
Write-Host "停止するには Ctrl+C"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response
    # 単一スレッド配信のため keep-alive を無効化（接続の取りこぼし防止）
    $res.KeepAlive = $false
    try {
      # URL パス → ローカルファイルパス
      $relative = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
      if ($relative -eq "/" -or $relative -eq "") { $relative = "/index.html" }
      $relative = $relative.TrimStart("/")
      $path = Join-Path $root $relative

      # ディレクトリトラバーサル防止
      $fullRoot = [System.IO.Path]::GetFullPath($root)
      $fullPath = [System.IO.Path]::GetFullPath($path)
      if (-not $fullPath.StartsWith($fullRoot)) {
        $res.StatusCode = 403
        $res.Close()
        continue
      }

      if (Test-Path $fullPath -PathType Container) {
        $fullPath = Join-Path $fullPath "index.html"
      }

      if (Test-Path $fullPath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
        $ct = $mime[$ext]
        if (-not $ct) { $ct = "application/octet-stream" }
        $res.ContentType = $ct
        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $relative")
        $res.OutputStream.Write($msg, 0, $msg.Length)
      }
    } catch {
      try {
        $res.StatusCode = 500
        $errText = "500: " + $_.Exception.Message + " @ " + $_.InvocationInfo.ScriptLineNumber
        $eb = [System.Text.Encoding]::UTF8.GetBytes($errText)
        $res.OutputStream.Write($eb, 0, $eb.Length)
      } catch {}
    } finally {
      try { $res.Close() } catch {}
    }
  }
} finally {
  $listener.Stop()
}
