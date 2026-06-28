$ErrorActionPreference = "Stop"

$repo = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$node = (Get-Command node.exe).Source
$script = Join-Path $repo "scripts\serve-static.js"
$dist = Join-Path $repo "dist-mobile-test"

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $node
$psi.Arguments = "`"$script`" `"$dist`" 8082"
$psi.WorkingDirectory = $repo
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $psi
[void]$process.Start()

Start-Sleep -Seconds 2
Write-Output "PID=$($process.Id) EXITED=$($process.HasExited)"
netstat -ano | Select-String ":8082"
