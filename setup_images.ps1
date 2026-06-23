# Script de preparación de imágenes para el Cotizador
# Hugo Zárate Publicidad

[Reflection.Assembly]::LoadWithPartialName("System.Drawing") | Out-Null

$workspaceDir = "d:\Usuarios\Desktop\AGENTE COTIZADOR"
$publicDir = "$workspaceDir\public"
$uploadsDir = "$publicDir\uploads"

# 1. Crear directorios si no existen
if (-not (Test-Path $publicDir)) {
    New-Item -ItemType Directory -Path $publicDir | Out-Null
    Write-Output "Directorio public creado."
}
if (-not (Test-Path $uploadsDir)) {
    New-Item -ItemType Directory -Path $uploadsDir | Out-Null
    Write-Output "Directorio public/uploads creado."
}

# Función para redimensionar imágenes con alta calidad
function Resize-Image {
    param(
        [string]$SourcePath,
        [string]$TargetPath,
        [int]$NewWidth
    )
    $src = [System.Drawing.Image]::FromFile($SourcePath)
    $ratio = $src.Height / $src.Width
    $NewHeight = [int]($NewWidth * $ratio)
    
    $bmp = New-Object System.Drawing.Bitmap($NewWidth, $NewHeight)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Configuraciones de alta calidad
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $g.DrawImage($src, 0, 0, $NewWidth, $NewHeight)
    
    # Guardar en formato PNG
    $bmp.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $bmp.Dispose()
    $src.Dispose()
    Write-Output "Imagen redimensionada y guardada en: $TargetPath"
}

# 2. Optimizar Logotipo
$logoFile = Get-ChildItem "$workspaceDir\*CON*TELEFONO*.png" | Select-Object -First 1
if (-not $logoFile) {
    $logoFile = Get-ChildItem "$workspaceDir\*LOGO*.png" | Select-Object -First 1
}
if ($logoFile) {
    Write-Output "Optimizando logotipo ($($logoFile.Name))..."
    Resize-Image -SourcePath $logoFile.FullName -TargetPath "$publicDir\logo.png" -NewWidth 600
} else {
    Write-Warning "No se encontró el archivo del logotipo."
}

# 3. Optimizar Firma Hugo
$hugoFirma = Get-ChildItem "$workspaceDir\*FIRMA*HUGO*.png" | Select-Object -First 1
if ($hugoFirma) {
    Write-Output "Optimizando firma de Hugo ($($hugoFirma.Name))..."
    Resize-Image -SourcePath $hugoFirma.FullName -TargetPath "$publicDir\signature.png" -NewWidth 300
} else {
    Write-Warning "No se encontró el archivo de la firma de Hugo (*FIRMA*HUGO*.png)."
}

# 4. Optimizar Firma Marilyn
$marilynFirma = Get-ChildItem "$workspaceDir\*FIRMA*MARILYN*.png" | Select-Object -First 1
if ($marilynFirma) {
    Write-Output "Optimizando firma de Marilyn..."
    Resize-Image -SourcePath $marilynFirma.FullName -TargetPath "$publicDir\signature_marilyn.png" -NewWidth 400
} else {
    Write-Warning "No se encontró el archivo de firma de Marilyn."
}

# 5. Optimizar QR Hugo Zárate
$hugoQR = Get-ChildItem "$workspaceDir\*QR*HUGO*.jpg" | Select-Object -First 1
if ($hugoQR) {
    Write-Output "Optimizando QR de Hugo Zárate..."
    Resize-Image -SourcePath $hugoQR.FullName -TargetPath "$publicDir\qr_hugo_zarate.png" -NewWidth 300
} else {
    Write-Warning "No se encontró el archivo del QR de Hugo Zárate."
}

# 6. Optimizar Encabezado de Cotización
$headerFile = Get-ChildItem "$workspaceDir\*ENCABEZADO*.png" | Select-Object -First 1
if ($headerFile) {
    Write-Output "Optimizando encabezado de cotización..."
    Resize-Image -SourcePath $headerFile.FullName -TargetPath "$publicDir\header_banner.png" -NewWidth 1200
} else {
    Write-Warning "No se encontró el archivo del encabezado (*ENCABEZADO*.png)."
}

# 7. Optimizar Palabra Cotización
$palabraFile = Get-ChildItem "$workspaceDir\*PALABRA*COTIZ*.png" | Select-Object -First 1
if ($palabraFile) {
    Write-Output "Optimizando palabra cotización..."
    Resize-Image -SourcePath $palabraFile.FullName -TargetPath "$publicDir\palabra_cotizacion.png" -NewWidth 600
} else {
    Write-Warning "No se encontró el archivo de la palabra cotización."
}

Write-Output "Inicialización de imágenes completada con éxito."
