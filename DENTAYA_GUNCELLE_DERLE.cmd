@echo off
setlocal DisableDelayedExpansion
cd /d "%~dp0"
if errorlevel 1 goto wrong
if not exist package.json goto wrong
findstr /C:"1.0.0-rc.58" package.json >nul
if errorlevel 1 goto wrong
if not exist electron\aya\language-packs.cjs goto wrong
if not exist electron\aya\core.cjs goto wrong
if not exist src\lib\i18n\UiNode.tsx goto wrong
if not exist scripts\package-windows.mjs goto wrong
echo DentAYA RC58 - Klasorlu modul menusu, is takibi ve AYA calisma bellegi
where node.exe >nul 2>nul
if errorlevel 1 goto missing_node
where npm.cmd >nul 2>nul
if errorlevel 1 goto missing_node
node "%~dp0scripts\package-windows.mjs" --check-node
if errorlevel 1 goto missing_node
if not exist .env.local goto missing_env
if not defined LOCALAPPDATA goto missing_local
if not exist "%SystemRoot%\System32\robocopy.exe" goto missing_local
set "DENTAYA_SOURCE=%CD%"
:choose_build
set "DENTAYA_BUILD=%LOCALAPPDATA%\DentAYA\Builds\rc52-%RANDOM%-%RANDOM%"
if exist "%DENTAYA_BUILD%" goto choose_build
mkdir "%DENTAYA_BUILD%"
if errorlevel 1 goto stage_failed
echo.
echo Kaynak: "%DENTAYA_SOURCE%"
echo Derleme: "%DENTAYA_BUILD%"
echo Dosyalar OneDrive disindaki yeni bir calisma klasorune kopyalaniyor.
"%SystemRoot%\System32\robocopy.exe" "%DENTAYA_SOURCE%" "%DENTAYA_BUILD%" /E /COPY:DT /DCOPY:T /R:2 /W:1 /XJ /XD node_modules .next .git dist-desktop .turbo out build coverage /XF tsconfig.tsbuildinfo /NFL /NDL /NJH /NJS /NP
if errorlevel 8 goto copy_failed
cd /d "%DENTAYA_BUILD%"
if errorlevel 1 goto stage_failed
if not exist .env.local goto copy_failed
if not exist package-lock.json goto copy_failed
call npm.cmd ci
if errorlevel 1 goto failed
node scripts\prepare-release-env.mjs
if errorlevel 1 goto failed
call npm.cmd run desktop:dist
if errorlevel 1 goto failed
node scripts\package-windows.mjs --show-result --reveal
if errorlevel 1 goto failed
echo.
echo Derleme tamamlandi. Kurulum adi: DentAYA-Setup-1.0.0-rc.58.exe
echo DentAYA programini kaydedip kapatin, sonra yeni Setup dosyasini calistirin.
pause
exit /b 0
:missing_node
echo Node.js 22.12.0 veya daha yeni surum ve npm 11 veya daha yeni surum gerekli.
pause
exit /b 1
:missing_env
echo .env.local dosyasi package.json ile ayni klasorde olmali.
echo Mevcut calisan projenizin .env.local dosyasini buraya kopyalayin.
pause
exit /b 1
:missing_local
echo Windows yerel derleme klasoru veya Robocopy bulunamadi.
echo LOCALAPPDATA ve Windows System32 klasorunu kontrol edin.
pause
exit /b 1
:stage_failed
echo Yerel derleme klasoru olusturulamadi veya acilamadi.
echo Diskte bos alan ve yerel klasor yazma iznini kontrol edin.
pause
exit /b 1
:copy_failed
echo Kaynak dosyalarin tamami yerel derleme klasorune kopyalanamadi.
echo Ustteki kopyalama hatasini paylasin. Kaynak projeye dokunulmadi.
pause
exit /b 1
:failed
echo Derleme basarisiz. Bu pencerenin hata metnini paylasin.
echo Calisma klasoru: "%DENTAYA_BUILD%"
pause
exit /b 1
:wrong
echo Bu dosyayi RC58 paketindeki package.json ile ayni klasore koyup acin.
echo Proje klasorunun adinin RC20 olmasi tek basina sorun degildir.
pause
exit /b 1
