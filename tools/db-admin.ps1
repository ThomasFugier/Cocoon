[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $CommandArgs
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
$nodeScript = Join-Path $scriptDir "db-admin.mjs"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required to run the DB admin tool."
}

Push-Location $repoRoot
try {
  & node $nodeScript @CommandArgs
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
