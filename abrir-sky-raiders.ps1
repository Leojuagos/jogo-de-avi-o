$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 4173
$gameUrl = "http://localhost:$port/?v=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
$server = Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue
if (-not $server) {
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        Start-Process -FilePath $python.Source -ArgumentList "-m http.server $port" -WorkingDirectory $projectPath -WindowStyle Hidden
    }
}
$browserCandidates = @(
    "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)
$browser = $browserCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($browser) {
    Start-Process -FilePath $browser -ArgumentList "--kiosk $gameUrl"
} else {
    Start-Process $gameUrl
}

