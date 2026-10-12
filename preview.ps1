# Bunn Corner — tiny local web server for previewing the site.
# Run it with:  powershell -ExecutionPolicy Bypass -File preview.ps1
# Then open:    http://localhost:4173

param(
  [int]$Port = 4173
)

$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
  $listener.Start()
} catch {
  Write-Host "Could not start the server on port $Port."
  Write-Host "Try another port, for example:  powershell -ExecutionPolicy Bypass -File preview.ps1 -Port 5500"
  exit 1
}

Write-Host ""
Write-Host "  Bunn Corner preview is running."
Write-Host "  Open this address in your browser:  http://localhost:$Port"
Write-Host "  Press Ctrl+C in this window to stop."
Write-Host ""

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".json" = "application/json"
  ".txt"  = "text/plain; charset=utf-8"
  ".md"   = "text/plain; charset=utf-8"
  ".webp" = "image/webp"
}

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
  } catch {
    break
  }

  $request = $context.Request
  $response = $context.Response

  $urlPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
  if ($urlPath -eq "/") { $urlPath = "/index.html" }

  $filePath = Join-Path $root ($urlPath.TrimStart("/") -replace "/", "\")

  # Block any attempt to escape the site folder
  $fullRoot = [System.IO.Path]::GetFullPath($root)
  $fullFile = [System.IO.Path]::GetFullPath($filePath)
  if (-not $fullFile.StartsWith($fullRoot)) {
    $response.StatusCode = 403
    $response.Close()
    continue
  }

  if (Test-Path $fullFile -PathType Leaf) {
    $ext = [System.IO.Path]::GetExtension($fullFile).ToLower()
    if ($mime.ContainsKey($ext)) {
      $response.ContentType = $mime[$ext]
    } else {
      $response.ContentType = "application/octet-stream"
    }
    $bytes = [System.IO.File]::ReadAllBytes($fullFile)
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
    Write-Host "200  $urlPath"
  } else {
    $response.StatusCode = 404
    $response.ContentType = "text/html; charset=utf-8"
    $body = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 - Not found</h1><p><a href='/'>Back to the home page</a></p>")
    $response.ContentLength64 = $body.Length
    $response.OutputStream.Write($body, 0, $body.Length)
    Write-Host "404  $urlPath"
  }

  $response.Close()
}
