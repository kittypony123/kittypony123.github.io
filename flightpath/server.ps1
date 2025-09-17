$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Server running at http://localhost:$port"
Write-Host "Press Ctrl+C to stop"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $path = $request.Url.LocalPath.TrimStart('/')
    if (!$path) { $path = "index.html" }
    
    if (Test-Path $path) {
        $content = [System.IO.File]::ReadAllBytes($path)
        
        $ext = [System.IO.Path]::GetExtension($path)
        switch ($ext) {
            ".js" { $response.ContentType = "application/javascript" }
            ".html" { $response.ContentType = "text/html" }
            ".css" { $response.ContentType = "text/css" }
        }
        
        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $response.StatusCode = 404
    }
    
    $response.Close()
}