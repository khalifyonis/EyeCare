# Regenerate docs/erd-diagram-word.png and .svg from PlantUML source
$puml = Join-Path $PSScriptRoot "..\docs\erd-diagram-word.puml"
$png  = Join-Path $PSScriptRoot "..\docs\erd-diagram-word.png"
$svg  = Join-Path $PSScriptRoot "..\docs\erd-diagram-word.svg"

Write-Host "Exporting ERD from $puml ..."

curl.exe -s -o $png -X POST "https://kroki.io/plantuml/png" `
  -H "Content-Type: text/plain" `
  --data-binary "@$puml"

curl.exe -s -o $svg -X POST "https://kroki.io/plantuml/svg" `
  -H "Content-Type: text/plain" `
  --data-binary "@$puml"

if ((Test-Path $png) -and ((Get-Item $png).Length -gt 1000)) {
  Write-Host "OK: $png ($((Get-Item $png).Length) bytes)"
} else {
  Write-Error "PNG export failed. Open https://www.plantuml.com/plantuml/uml/ and paste erd-diagram-word.puml"
}

if ((Test-Path $svg) -and ((Get-Item $svg).Length -gt 1000)) {
  Write-Host "OK: $svg ($((Get-Item $svg).Length) bytes)"
}
