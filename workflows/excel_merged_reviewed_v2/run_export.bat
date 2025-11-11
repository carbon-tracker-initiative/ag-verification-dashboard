@echo off
echo Starting Comprehensive Excel Export v2...
call ag-env\Scripts\activate.bat
python workflows/excel_merged_reviewed_v2/export_comprehensive.py %*
echo Export completed!
pause