@echo off
TITLE NEXUS-SC AI Training Interface (A2000 GPU)
color 0B

echo ==========================================================
echo        NEXUS-SC: ORACLE AI TRAINING PORTAL
echo ==========================================================
echo.
echo Hello! This script will automatically train the shipping
echo intelligence model using your NVIDIA A2000 Graphics Card.
echo.
echo Step 1: Checking Python environment...

:: Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [!] ERROR: Python is not installed or not in your system PATH.
    echo Please install Python 3.11+ before running this.
    pause
    exit /b
)

:: Ensure venv exists
if not exist "venv\Scripts\activate.bat" (
    echo Step 2: Creating virtual environment... (This might take a minute)
    python -m venv venv
)

:: Activate environment
echo Step 3: Activating environment...
call venv\Scripts\activate.bat

:: Install Requirements
echo Step 4: Ensuring AI / Deep Learning dependencies are installed...
:: We use the specific PyTorch index to guarantee NVIDIA CUDA compatibility
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121 --quiet
pip install -r backend\requirements.txt --quiet

echo.
echo ==========================================================
echo    HARDWARE ENVIRONMENT PREPARED. INITIALIZING TRAINING.
echo ==========================================================
echo.
echo Please do not close this window until the training is complete!
echo.

:: Run the script
python backend\oracle\train_oracle.py

echo.
echo ==========================================================
if %ERRORLEVEL% EQU 0 (
    color 0A
    echo    SUCCESS! The model weights have been saved successfully!
    echo    You can now close this window.
) else (
    color 0C
    echo    FAILED. An error occurred during the training process.
    echo    Please copy any error text above and send it to the developer.
)
echo ==========================================================
echo.
pause
