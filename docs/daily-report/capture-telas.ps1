param([string]$OutDir, [int]$Wait = 12, [int]$CropTop = 122)
# Abre cada URL numa janela nova do Chrome (mesmo perfil logado), captura a janela por PrintWindow,
# corta a barra do navegador e fecha a janela. Descobre a janela nova por diferenca de handles.
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
$jobs = @(
  @{ n = "tela1-gsc-desempenho"; u = "https://search.google.com/u/2/search-console/performance/search-analytics?resource_id=https%3A%2F%2Fwevolv3.com%2F&num_of_days=28" },
  @{ n = "tela2-gsc-visaogeral"; u = "https://search.google.com/u/2/search-console/index?resource_id=https%3A%2F%2Fwevolv3.com%2F" },
  @{ n = "tela3-gsc-links";      u = "https://search.google.com/u/2/search-console/links?resource_id=https%3A%2F%2Fwevolv3.com%2F" },
  @{ n = "tela4-ga4-aquisicao";  u = "https://analytics.google.com/analytics/web/?authuser=2#/p515955885/reports/explorer?params=_u..nav%3Dmaui&r=lifecycle-traffic-acquisition-v2" },
  @{ n = "tela5-bing-backlinks"; u = "https://www.bing.com/webmasters/backlinks?siteUrl=https://wevolv3.com/" }
)
foreach ($j in $jobs) {
  $before = [CU]::Wins()
  Start-Process $chromeExe -ArgumentList "--new-window", "`"$($j.u)`""
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
