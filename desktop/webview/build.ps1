$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$buildRoot = Join-Path $projectRoot 'release\light-build'
$appRoot = Join-Path $buildRoot 'app'
New-Item -ItemType Directory -Force $appRoot | Out-Null

function Get-BuildDownload($Url, $FileName) {
    $destination = Join-Path $buildRoot $FileName
    if (-not (Test-Path -LiteralPath $destination)) {
        & curl.exe -sS -L --fail --retry 2 --connect-timeout 15 --max-time 180 -o $destination $Url
        if ($LASTEXITCODE -ne 0) {
            Remove-Item -LiteralPath $destination -Force -ErrorAction SilentlyContinue
            throw "Download failed: $FileName"
        }
    }
    return $destination
}

$webviewArchive = Get-BuildDownload 'https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/1.0.4314.35/microsoft.web.webview2.1.0.4314.35.nupkg' 'webview2.zip'
$nsisArchive = Get-BuildDownload 'https://npmmirror.com/mirrors/electron-builder-binaries/nsis-3.0.4.1/nsis-3.0.4.1.7z' 'nsis.7z'
$sevenZipArchive = Get-BuildDownload 'https://registry.npmjs.org/7zip-bin/-/7zip-bin-5.2.0.tgz' '7zip-bin.tgz'
$bootstrapper = Get-BuildDownload 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' 'MicrosoftEdgeWebview2Setup.exe'
$signature = Get-AuthenticodeSignature -LiteralPath $bootstrapper
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation') {
    throw 'WebView2 bootstrapper signature verification failed'
}
$nsisHash = [Convert]::ToBase64String([Security.Cryptography.SHA512]::Create().ComputeHash([IO.File]::ReadAllBytes($nsisArchive)))
if ($nsisHash -ne 'VKMiizYdmNdJOWpRGz4trl4lD++BvYP2irAXpMilheUP0pc93iKlWAoP843Vlraj8YG19CVn0j+dCo/hURz9+Q==') {
    throw 'NSIS checksum verification failed'
}
if (-not (Test-Path (Join-Path $buildRoot 'webview2\lib\net462'))) {
    Expand-Archive -LiteralPath $webviewArchive -DestinationPath (Join-Path $buildRoot 'webview2') -Force
}
if (-not (Test-Path (Join-Path $buildRoot 'package\win\x64\7za.exe'))) {
    & tar.exe -xf $sevenZipArchive -C $buildRoot
    if ($LASTEXITCODE -ne 0) { throw '7zip extraction failed' }
}
if (-not (Test-Path (Join-Path $buildRoot 'nsis\Bin\makensis.exe'))) {
    & (Join-Path $buildRoot 'package\win\x64\7za.exe') x $nsisArchive "-o$buildRoot\nsis" -y | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'NSIS extraction failed' }
}
$webviewLibraries = Join-Path $buildRoot 'webview2\lib\net462'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $compiler /nologo /target:winexe /platform:x64 /optimize+ "/out:$appRoot\Pixel Jadecraft.exe" "/win32manifest:$PSScriptRoot\app.manifest" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll "/reference:$webviewLibraries\Microsoft.Web.WebView2.Core.dll" "/reference:$webviewLibraries\Microsoft.Web.WebView2.WinForms.dll" (Join-Path $PSScriptRoot 'Program.cs')
if ($LASTEXITCODE -ne 0) { throw 'Desktop launcher compilation failed' }
Copy-Item -LiteralPath (Join-Path $webviewLibraries 'Microsoft.Web.WebView2.Core.dll'), (Join-Path $webviewLibraries 'Microsoft.Web.WebView2.WinForms.dll') -Destination $appRoot -Force
Copy-Item -LiteralPath (Join-Path $buildRoot 'webview2\runtimes\win-x64\native\WebView2Loader.dll'), $bootstrapper -Destination $appRoot -Force
$gameOutput = Join-Path $appRoot 'dist'
if (Test-Path -LiteralPath $gameOutput) {
    $resolvedGameOutput = [IO.Path]::GetFullPath($gameOutput)
    if (-not $resolvedGameOutput.StartsWith($appRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid game output path' }
    Remove-Item -LiteralPath $resolvedGameOutput -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $projectRoot 'dist') -Destination $gameOutput -Recurse
& (Join-Path $buildRoot 'nsis\Bin\makensis.exe') /V2 /INPUTCHARSET UTF8 (Join-Path $PSScriptRoot 'installer.nsi')
if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed' }
Get-Item (Join-Path $projectRoot 'release\Pixel-Jadecraft-Lite-Setup-0.1.0-x64.exe') | Select-Object Name, Length
