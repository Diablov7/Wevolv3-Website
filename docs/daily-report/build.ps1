$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$html = [System.IO.File]::ReadAllText("$dir\raio-x-template.html", [System.Text.Encoding]::UTF8)
$map = [ordered]@{
  "{{IMG1}}" = "tela1-gsc-desempenho"
  "{{IMG2}}" = "tela2-gsc-visaogeral"
  "{{IMG3}}" = "tela3-gsc-links"
  "{{IMG4}}" = "tela4-ga4-aquisicao"
  "{{IMG5}}" = "tela5-bing-backlinks"
}
foreach ($k in $map.Keys) {
  $b64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("$dir\telas\$($map[$k]).png"))
  $html = $html.Replace($k, "data:image/png;base64,$b64")
}
[System.IO.File]::WriteAllText("$dir\raio-x-aquisicao.html", $html, (New-Object System.Text.UTF8Encoding($false)))
"ok: $([math]::Round((Get-Item "$dir\raio-x-aquisicao.html").Length/1MB,2)) MB, placeholders restantes: $(([regex]::Matches($html,'\{\{IMG')).Count)"
