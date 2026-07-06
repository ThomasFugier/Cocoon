[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $CommandArgs
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
$nodeScript = Join-Path $scriptDir "user-admin-server.mjs"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required to run the User Admin tool."
}

Push-Location $repoRoot
try {
  & node $nodeScript --open @CommandArgs
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
