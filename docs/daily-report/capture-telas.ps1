# -Extra "nome=url","nome2=url2" captura telas alem das 5 do relatorio (plano B da rotina
# quando a extensao do Chrome cai: Bing Search Performance, Platform Properties etc.).
# -SoExtra pula as 5 padrao e captura so as extras.
param([string]$OutDir, [int]$Wait = 12, [int]$CropTop = 122, [string[]]$Extra = @(), [switch]$SoExtra,
      [string]$ChromeProfile = "Profile 2", [string]$Conta = "diablov2021@gmail.com",
      [string]$BingProfile = "Default")
# O Bing Webmaster NAO esta logado no Profile 2 (abre a tela de "Get started"); o login dele vive
# no perfil Default. Por isso a tela 5 usa $BingProfile.
# Abre cada URL numa janela nova do Chrome, captura a janela por PrintWindow,
# corta a barra do navegador e fecha a janela. Descobre a janela nova por diferenca de handles.
#
# Perfil e conta FIXOS desde 29/09/2026. Antes o script abria no ultimo perfil usado ("Default",
# conta romulololico) e as URLs usavam /u/2, o indice da conta dentro do perfil. O Chrome tem 9
# perfis e o indice muda quando uma conta entra ou sai (em 28/09 o /u/2 virou vadevox.digital),
# entao a tela saia da conta errada ou nem era recapturada. Agora: --profile-directory aponta o
# perfil "Sun and moon" (Profile 2, logado em diablov2021) e authuser=<email> faz o Google achar a
# conta pelo e-mail, seja qual for o indice. Conferir o perfil em
# "%LOCALAPPDATA%\Google\Chrome\User Data\Local State" (profile.info_cache) se algum dia mudar.
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text; using System.Collections.Generic;
public class CU {
  public delegate bool P(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(P cb, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint f);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int hh, bool r);
  public struct RECT { public int L, T, R, B; }
  public static List<IntPtr> Wins() {
    var l = new List<IntPtr>();
    EnumWindows((h, x) => { var c = new StringBuilder(256); GetClassName(h, c, 256);
      if (c.ToString() == "Chrome_WidgetWin_1" && IsWindowVisible(h)) { var t = new StringBuilder(8); if (GetWindowText(h, t, 8) > 0) l.Add(h); }
      return true; }, IntPtr.Zero);
    return l;
  }
  public static string Title(IntPtr h) { var t = new StringBuilder(512); GetWindowText(h, t, 512); return t.ToString(); }
}
"@
$chromeExe = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -ErrorAction SilentlyContinue).'(default)'
if (-not $chromeExe) { $chromeExe = "C:\Program Files\Google\Chrome\Application\chrome.exe" }
$au = [uri]::EscapeDataString($Conta)
$jobs = @(
  @{ n = "tela1-gsc-desempenho"; u = "https://search.google.com/search-console/performance/search-analytics?resource_id=https%3A%2F%2Fwevolv3.com%2F&num_of_days=28&authuser=$au" },
  @{ n = "tela2-gsc-visaogeral"; u = "https://search.google.com/search-console/index?resource_id=https%3A%2F%2Fwevolv3.com%2F&authuser=$au" },
  @{ n = "tela3-gsc-links";      u = "https://search.google.com/search-console/links?resource_id=https%3A%2F%2Fwevolv3.com%2F&authuser=$au" },
  @{ n = "tela4-ga4-aquisicao";  u = "https://analytics.google.com/analytics/web/?authuser=$au#/p515955885/reports/explorer?params=_u..nav%3Dmaui&r=lifecycle-traffic-acquisition-v2" },
  @{ n = "tela5-bing-backlinks"; u = "https://www.bing.com/webmasters/backlinks?siteUrl=https://wevolv3.com/"; p = $BingProfile }
)
if ($SoExtra) { $jobs = @() }
foreach ($e in $Extra) {
  $nome, $url = $e -split '=', 2
  $jobs += @{ n = $nome; u = $url }
}
foreach ($j in $jobs) {
  $before = [CU]::Wins()
  $perfil = if ($j.p) { $j.p } else { $ChromeProfile }
  Start-Process $chromeExe -ArgumentList "--profile-directory=`"$perfil`"", "--new-window", "`"$($j.u)`""
  $h = [IntPtr]::Zero
  for ($i = 0; $i -lt 20 -and $h -eq [IntPtr]::Zero; $i++) {
    Start-Sleep -Milliseconds 500
    $new = [CU]::Wins() | Where-Object { $before -notcontains $_ }
    if ($new) { $h = @($new)[0] }
  }
  if ($h -eq [IntPtr]::Zero) { "FALHOU (sem janela nova): $($j.n)"; continue }
  [void][CU]::MoveWindow($h, 0, 0, 1440, 1000, $true)
  Start-Sleep -Seconds $Wait
  $r = New-Object CU+RECT; [void][CU]::GetWindowRect($h, [ref]$r)
  $w = $r.R - $r.L; $hh = $r.B - $r.T
  $bmp = New-Object System.Drawing.Bitmap $w, $hh
  $g = [System.Drawing.Graphics]::FromImage($bmp); $dc = $g.GetHdc(); [void][CU]::PrintWindow($h, $dc, 2); $g.ReleaseHdc($dc); $g.Dispose()
  $crop = $bmp.Clone((New-Object System.Drawing.Rectangle 8, $CropTop, ($w - 16), ($hh - $CropTop - 8)), $bmp.PixelFormat); $bmp.Dispose()
  $out = Join-Path $OutDir "$($j.n).png"; $crop.Save($out, [System.Drawing.Imaging.ImageFormat]::Png); $crop.Dispose()
  "ok $($j.n) | $([CU]::Title($h)) | $((Get-Item $out).Length) bytes"
  [void][CU]::PostMessage($h, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
  Start-Sleep -Milliseconds 800
}
