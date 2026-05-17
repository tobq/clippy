@echo off
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://clippy.sh/update.ps1 | iex"
