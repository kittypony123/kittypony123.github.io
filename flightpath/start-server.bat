@echo off
echo Starting HTTP server for newhex project...
echo.
echo Option 1: If you have Python installed:
echo python -m http.server 8000
echo.
echo Option 2: If you have Node.js installed:
echo npx serve . -p 8000
echo.
echo Option 3: Using PowerShell (built-in):
powershell -ExecutionPolicy Bypass -Command "& { $port = 8000; $listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:' + $port + '/'); $listener.Start(); Write-Host 'Server running at http://localhost:' $port; Write-Host 'Press Ctrl+C to stop'; try { while ($true) { $context = $listener.GetContext(); $request = $context.Request; $response = $context.Response; $path = $request.Url.LocalPath.TrimStart('/'); if ($path -eq '') { $path = 'index.html' }; $filePath = Join-Path (Get-Location) $path; if (Test-Path $filePath) { $content = [IO.File]::ReadAllBytes($filePath); $ext = [IO.Path]::GetExtension($filePath); if ($ext -eq '.js') { $response.ContentType = 'application/javascript' } elseif ($ext -eq '.html') { $response.ContentType = 'text/html' } elseif ($ext -eq '.css') { $response.ContentType = 'text/css' }; $response.ContentLength64 = $content.Length; $response.OutputStream.Write($content, 0, $content.Length); $response.StatusCode = 200 } else { $response.StatusCode = 404 }; $response.Close() } } finally { $listener.Stop() } }"
pause
