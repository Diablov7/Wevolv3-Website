# Imagens NAO vao mais embutidas em base64: o viewer do artifact quebrava data: URIs grandes.
# Cada tela e enviada ao asset store do artifact (Artifact action "upload_asset") e o link
# /_blob/<id> retornado fica em telas\assets.json. Ao trocar uma tela: upload do PNG novo,
# atualizar o id no JSON, apagar o asset antigo (action "delete_asset") e rodar este script.
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$html = [System.IO.File]::ReadAllText("$dir\raio-x-template.html", [System.Text.Encoding]::UTF8)
$map = Get-Content "$dir\telas\assets.json" -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($p in $map.PSObject.Properties) {
  $html = $html.Replace($p.Name, $p.Value)
}
[System.IO.File]::WriteAllText("$dir\raio-x-aquisicao.html", $html, (New-Object System.Text.UTF8Encoding($false)))
"ok: $([math]::Round((Get-Item "$dir\raio-x-aquisicao.html").Length/1KB,0)) KB, placeholders restantes: $(([regex]::Matches($html,'\{\{IMG')).Count)"
