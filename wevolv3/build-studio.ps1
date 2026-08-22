# Regera o build do Sanity Studio para a pasta /studio na raiz do site.
#
# Rode a partir desta pasta:  .\build-studio.ps1
#
# Existe porque o build padrao do Sanity NAO produz um bundle utilizavel neste
# site. Tres detalhes, todos descobertos na marra em 2026-08-22:
#
# 1. BASE PATH vem da variavel SANITY_STUDIO_BASEPATH, nao de flag de CLI (a v4
#    nao tem --base) e nao de basePath no sanity.config.ts. Colocar tambem no
#    config duplica o prefixo e a URL vira /studio/studio.
# 2. AUTO-UPDATES tem que ficar desligado no sanity.cli.ts. Ligado, o build gera
#    uma pasta /vendor com modulos .mjs vindos de sanity-cdn.com, e os dois
#    quebram em producao: netlify.toml tem "/studio/*" -> index.html com
#    force=true (so /studio/static/* escapa), e a CSP do site restringe script-src.
# 3. Os 4 links de icone e manifest saem sem o prefixo mesmo com o env var, e
#    precisam do patch abaixo.
#
# O _redirects da pasta /studio e escrito a mao e o sanity build nao gera ele,
# entao e preservado aqui.

$ErrorActionPreference = 'Stop'

$src = $PSScriptRoot
$dst = Join-Path (Split-Path -Parent $src) 'studio'
$tmp = Join-Path $env:TEMP ('studio_build_' + [guid]::NewGuid().ToString('N').Substring(0, 8))

Write-Host "Buildando o Studio..." -ForegroundColor Cyan
$env:SANITY_STUDIO_BASEPATH = '/studio'
Push-Location $src
try {
  npx sanity build $tmp -y
  if ($LASTEXITCODE -ne 0) { throw "sanity build falhou com codigo $LASTEXITCODE" }
}
finally { Pop-Location }

if (Test-Path (Join-Path $tmp 'vendor')) {
  throw "O build gerou a pasta /vendor, ou seja auto-updates esta ligado. Ponha autoUpdates: false no sanity.cli.ts e rode de novo."
}

Write-Host "Corrigindo os caminhos de icone e manifest..." -ForegroundColor Cyan
$indexPath = Join-Path $tmp 'index.html'
$html = [System.IO.File]::ReadAllText($indexPath, [System.Text.Encoding]::UTF8)
$html = $html -replace '(href=")/static/', '$1/studio/static/'
[System.IO.File]::WriteAllText($indexPath, $html, (New-Object System.Text.UTF8Encoding($false)))

$wrong = ([regex]::Matches($html, '(href|src)="/(static|vendor)/')).Count
if ($wrong -gt 0) { throw "Ainda sobraram $wrong caminhos sem o prefixo /studio no index.html." }

Write-Host "Instalando em $dst (preservando _redirects)..." -ForegroundColor Cyan
Copy-Item (Join-Path $dst '_redirects') (Join-Path $tmp '_redirects') -Force
Remove-Item (Join-Path $dst 'static') -Recurse -Force
Remove-Item (Join-Path $dst 'index.html') -Force
Copy-Item (Join-Path $tmp '*') $dst -Recurse -Force
Remove-Item $tmp -Recurse -Force

Write-Host "OK. Confira com:  npx http-server . -p 8899 -c-1   e abra /studio" -ForegroundColor Green
Write-Host "Em localhost o Sanity vai pedir para liberar a origem no CORS. Em wevolv3.com nao pede." -ForegroundColor DarkGray
