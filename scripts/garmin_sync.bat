@echo off
REM Daily Garmin -> Firestore sync (Stage 1 Python, Stage 2 Node).
REM Register with Windows Task Scheduler to run daily.
setlocal
cd /d "%~dp0\.."

set GOOGLE_APPLICATION_CREDENTIALS=%CD%\serviceAccountKey.json

echo [%date% %time%] Garmin sync start >> scripts\logs\garmin_sync.log
".venv-garmin\Scripts\python.exe" -m scripts.garmin_sync --days 7 >> scripts\logs\garmin_sync.log 2>&1
node scripts\computeSegments.js >> scripts\logs\garmin_sync.log 2>&1
echo [%date% %time%] Garmin sync done >> scripts\logs\garmin_sync.log
endlocal
