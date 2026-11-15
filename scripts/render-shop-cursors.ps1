# Windows-only offline SVG rasterizer for the small, authored cursor vocabulary.
# System.Drawing is part of the host; no package installation or runtime build.
Add-Type -AssemblyName System.Drawing
$assetRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../dist/assets/shop'))
$cursorNames = @('ember','leaf','rainbow','frost','amethyst','comet','bubble','shell','heart','butterfly','nova')

function Number-Attr($node, $name, $fallback = 0) {
  $value = $node.GetAttribute($name)
  if (!$value) { return [double]$fallback }
  return [double]::Parse($value, [Globalization.CultureInfo]::InvariantCulture)
}
function Paint-Colour($text, $opacity = 1) {
  if (!$text -or $text -eq 'none') { return $null }
  $colour = [Drawing.ColorTranslator]::FromHtml($text)
  return [Drawing.Color]::FromArgb([int](255 * $opacity), $colour.R, $colour.G, $colour.B)
}
function Svg-Path($text) {
  $tokens = [regex]::Matches($text, '[A-Za-z]|-?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?') | ForEach-Object Value
  $path = [Drawing.Drawing2D.GraphicsPath]::new()
  $i = 0; $x = 0.0; $y = 0.0; $sx = 0.0; $sy = 0.0
  while ($i -lt $tokens.Count) {
    $op = $tokens[$i++].ToUpperInvariant()
    switch ($op) {
      'M' { $x = [double]$tokens[$i++]; $y = [double]$tokens[$i++]; $sx = $x; $sy = $y; $path.StartFigure() }
      'L' { $nx = [double]$tokens[$i++]; $ny = [double]$tokens[$i++]; $path.AddLine([single]$x,[single]$y,[single]$nx,[single]$ny); $x=$nx; $y=$ny }
      'C' { $a=[double]$tokens[$i++]; $b=[double]$tokens[$i++]; $c=[double]$tokens[$i++]; $d=[double]$tokens[$i++]; $nx=[double]$tokens[$i++]; $ny=[double]$tokens[$i++]; $path.AddBezier([single]$x,[single]$y,[single]$a,[single]$b,[single]$c,[single]$d,[single]$nx,[single]$ny); $x=$nx; $y=$ny }
      'Z' { $path.CloseFigure(); $x=$sx; $y=$sy }
      default { throw "Unsupported authored SVG path command: $op" }
    }
  }
  return ,$path
}
function Draw-SvgNode($node, $graphics) {
  if ($node.NodeType -ne [Xml.XmlNodeType]::Element -or $node.GetAttribute('data-raster') -eq 'skip') { return }
  if ($node.LocalName -in @('defs','style','title')) { return }
  $saved = $graphics.Save()
  $translate = [regex]::Match($node.GetAttribute('transform'), 'translate\(([-.\d]+)[, ]+([-.\d]+)\)')
  if ($translate.Success) { $graphics.TranslateTransform([single]$translate.Groups[1].Value, [single]$translate.Groups[2].Value) }
  $shape = $null
  switch ($node.LocalName) {
    'path' { $shape = Svg-Path $node.GetAttribute('d') }
    'circle' { $r=Number-Attr $node 'r'; $shape=[Drawing.Drawing2D.GraphicsPath]::new(); $shape.AddEllipse([single]((Number-Attr $node 'cx')-$r),[single]((Number-Attr $node 'cy')-$r),[single](2*$r),[single](2*$r)) }
    'ellipse' { $rx=Number-Attr $node 'rx'; $ry=Number-Attr $node 'ry'; $shape=[Drawing.Drawing2D.GraphicsPath]::new(); $shape.AddEllipse([single]((Number-Attr $node 'cx')-$rx),[single]((Number-Attr $node 'cy')-$ry),[single](2*$rx),[single](2*$ry)) }
  }
  if ($shape) {
    $fill = $node.GetAttribute('data-base-fill'); if (!$fill) { $fill=$node.GetAttribute('fill') }
    $opacity = Number-Attr $node 'opacity' 1
    $colour = Paint-Colour $fill $opacity
    if ($colour) { $brush=[Drawing.SolidBrush]::new($colour); $graphics.FillPath($brush,$shape); $brush.Dispose() }
    $stroke=Paint-Colour $node.GetAttribute('stroke') $opacity
    if ($stroke) {
      $pen=[Drawing.Pen]::new($stroke,[single](Number-Attr $node 'stroke-width' 1))
      $pen.LineJoin=[Drawing.Drawing2D.LineJoin]::Round
      if ($node.GetAttribute('stroke-linecap') -eq 'round') { $pen.StartCap=$pen.EndCap=[Drawing.Drawing2D.LineCap]::Round }
      $graphics.DrawPath($pen,$shape); $pen.Dispose()
    }
    $shape.Dispose()
  }
  foreach ($child in $node.ChildNodes) { Draw-SvgNode $child $graphics }
  $graphics.Restore($saved)
}
foreach ($name in $cursorNames) {
  $variants = @("cursor-$name")
  if ($name -notin @('ember','leaf','bubble','shell')) { $variants += "cursor-$name-pointer" }
  foreach ($variant in $variants) {
    [xml]$svg = Get-Content -LiteralPath (Join-Path $assetRoot "$variant.svg") -Raw
    $large=[Drawing.Bitmap]::new(256,256,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g=[Drawing.Graphics]::FromImage($large); $g.Clear([Drawing.Color]::Transparent)
    $g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias; $g.ScaleTransform(8,8)
    Draw-SvgNode $svg.DocumentElement $g; $g.Dispose()
    $small=[Drawing.Bitmap]::new(32,32,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g=[Drawing.Graphics]::FromImage($small); $g.Clear([Drawing.Color]::Transparent)
    $g.CompositingMode=[Drawing.Drawing2D.CompositingMode]::SourceCopy
    $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($large,0,0,32,32); $g.Dispose()
    $small.Save((Join-Path $assetRoot "$variant.png"),[Drawing.Imaging.ImageFormat]::Png)
    $small.Dispose(); $large.Dispose()
  }
}
Write-Output 'Rendered eleven full static PNG cursors and arrow-only native underlays for the animated tiers.'
