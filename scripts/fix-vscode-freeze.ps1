$ErrorActionPreference = "Continue"

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $env:APPDATA "Code\User\_freeze_fix_backup_$stamp"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

$targets = @(
  (Join-Path $env:APPDATA "Code\User\workspaceStorage"),
  (Join-Path $env:APPDATA "Code\Cache"),
  (Join-Path $env:APPDATA "Code\Code Cache"),
  (Join-Path $env:APPDATA "Code\GPUCache")
)

$chatGlobal = Join-Path $env:APPDATA "Code\User\globalStorage\github.copilot-chat"
if (Test-Path $chatGlobal) {
  $chatBackup = Join-Path $backupRoot "github.copilot-chat"
  Copy-Item -Path $chatGlobal -Destination $chatBackup -Recurse -Force
}

foreach ($path in $targets) {
  if (Test-Path $path) {
    try {
      Remove-Item -Path $path -Recurse -Force
      Write-Output "cleared: $path"
    }
    catch {
      Write-Output "failed: $path"
      Write-Output $_.Exception.Message
    }
  }
  else {
    Write-Output "not found: $path"
  }
}

Write-Output "backup: $backupRoot"
Write-Output "done"
