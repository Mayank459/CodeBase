@echo off
REM Startup script for Codebase RAG Assistant Streamlit app with keep-alive support

echo ======================================
echo Codebase RAG Assistant - Startup
echo ======================================
echo.

REM Check if .env file exists
if not exist .env (
    echo Warning: .env file not found
    echo Creating .env template...
    (
        echo API_BASE=http://localhost:8000
        echo GROQ_API_KEY=your_groq_api_key
        echo GOOGLE_API_KEY=your_google_api_key
    ) > .env
    echo .env file created. Please update it with your API keys.
    echo.
)

REM Load environment variables from .env
for /f "tokens=1,2 delims==" %%A in (.env) do (
    if not "%%A"=="" (
        if not "%%A:~0,1%%"=="#" (
            set "%%A=%%B"
        )
    )
)

echo API Base URL: %API_BASE%
echo.
echo Starting Streamlit app with keep-alive daemon...
echo The keep-alive script will ping the backend every 5 minutes to prevent it from sleeping.
echo.

REM Run Streamlit
streamlit run app.py ^
    --logger.level=info ^
    --client.showErrorDetails=true ^
    --server.enableCORS=true ^
    --server.enableXsrfProtection=false

pause
