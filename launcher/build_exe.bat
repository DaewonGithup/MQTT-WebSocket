@echo off
rem Builds ..MQTT-Share.exe from launcher.cs with the C# compiler built into Windows.
"%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /codepage:65001 /target:exe /optimize ^
  /out:"%~dp0..\MQTT-Share.exe" "%~dp0launcher.cs"
if errorlevel 1 (echo BUILD FAILED & pause & exit /b 1)
echo Built: MQTT-Share.exe
