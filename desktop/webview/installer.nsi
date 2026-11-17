Unicode true
!include "MUI2.nsh"
Name "像素琢玉"
OutFile "..\..\release\Pixel-Jadecraft-Lite-Setup-0.1.0-x64.exe"
InstallDir "$LOCALAPPDATA\Programs\Pixel Jadecraft Lite"
InstallDirRegKey HKCU "Software\PixelJadecraftLite" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\Pixel Jadecraft.exe"
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"
Section "Game"
  SetOutPath "$INSTDIR"
  File /r "..\..\release\light-build\app\*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\像素琢玉 轻量版.lnk" "$INSTDIR\Pixel Jadecraft.exe"
  CreateShortcut "$SMPROGRAMS\像素琢玉 轻量版.lnk" "$INSTDIR\Pixel Jadecraft.exe"
  WriteRegStr HKCU "Software\PixelJadecraftLite" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\PixelJadecraftLite" "DisplayName" "像素琢玉 轻量版"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\PixelJadecraftLite" "DisplayVersion" "0.1.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\PixelJadecraftLite" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\PixelJadecraftLite" "DisplayIcon" "$INSTDIR\Pixel Jadecraft.exe"
SectionEnd
Section "Uninstall"
  Delete "$DESKTOP\像素琢玉 轻量版.lnk"
  Delete "$SMPROGRAMS\像素琢玉 轻量版.lnk"
  RMDir /r "$INSTDIR\dist"
  Delete "$INSTDIR\Pixel Jadecraft.exe"
  Delete "$INSTDIR\Microsoft.Web.WebView2.Core.dll"
  Delete "$INSTDIR\Microsoft.Web.WebView2.WinForms.dll"
  Delete "$INSTDIR\WebView2Loader.dll"
  Delete "$INSTDIR\MicrosoftEdgeWebview2Setup.exe"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\PixelJadecraftLite"
  DeleteRegKey HKCU "Software\PixelJadecraftLite"
SectionEnd
