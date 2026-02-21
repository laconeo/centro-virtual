Add-Type -AssemblyName System.Drawing

$src = "c:\Users\laconeo\Documents\centro-virtual\public\fs_logo_favicon_sq.png"
$outDir = "c:\Users\laconeo\Documents\centro-virtual\chrome-extension\icons"

$original = [System.Drawing.Image]::FromFile($src)

foreach ($size in @(16, 32, 48, 128)) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($original, 0, 0, $size, $size)
    $g.Dispose()
    $outPath = Join-Path $outDir ("icon" + $size + ".png")
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Guardado: icon${size}.png"
}

$original.Dispose()
Write-Host "Todos los iconos generados exitosamente."
