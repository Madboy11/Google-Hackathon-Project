@echo off
cd /d %~dp0
TITLE NEXUS-SC AI Training Interface (RTX 3050 Mobile)
color 0B

echo ==========================================================
echo        NEXUS-SC: ORACLE AI TRAINING PORTAL
echo ==========================================================
echo.
echo Hello! This script will automatically train the shipping
echo intelligence model using your NVIDIA RTX 3050 Laptop GPU.
echo.
echo Step 1: Checking Python environment...

set PYTHON_EXE=D:\Python311\python.exe
set VENV_PATH=venv

:: Check if the base Python exists
if not exist "%PYTHON_EXE%" (
    color 0C
    echo [!] ERROR: Python is not installed at %PYTHON_EXE%.
    pause
    exit /b
)

:: Step 2: Ensure venv exists
if not exist "%VENV_PATH%\Scripts\python.exe" (
    echo Step 2: Creating virtual environment...
    "%PYTHON_EXE%" -m virtualenv %VENV_PATH%
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo [!] ERROR: Failed to create virtual environment.
        pause
        exit /b
    )
)

:: Step 3: Install/Update Requirements using the venv's python directly
echo Step 3: Ensuring AI / Deep Learning dependencies are installed...
"%VENV_PATH%\Scripts\python.exe" -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121 --quiet
"%VENV_PATH%\Scripts\python.exe" -m pip install -r backend\requirements.txt --quiet
"%VENV_PATH%\Scripts\python.exe" -m pip install pandas pyarrow scikit-learn numpy --quiet

echo.
echo ==========================================================
echo    HARDWARE ENVIRONMENT PREPARED. INITIALIZING TRAINING.
echo ==========================================================
echo.
echo [MEMORY PROTECTION ON] Limiting VRAM fragmentation for 4GB constraints...
set PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
echo Please do not close this window until the training is complete!
echo.

:: Step 4: Run the training script
"%VENV_PATH%\Scripts\python.exe" backend\oracle\train_oracle.py

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
