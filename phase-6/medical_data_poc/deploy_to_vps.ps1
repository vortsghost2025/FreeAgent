# Deploy Operation Nightingale Web Clinic to VPS
# Run this script to properly deploy with process persistence

Write-Host "=== Operation Nightingale VPS Deployment ===" -ForegroundColor Cyan
Write-Host "This will deploy the web clinic with proper process management" -ForegroundColor Yellow
Write-Host ""

$VPS_IP = "187.77.3.56"
$VPS_USER = "root"
$REMOTE_DIR = "/root/medical_data_poc"

Write-Host "Step 1: Creating deployment package..." -ForegroundColor Green
# Create deployment files list
$files = @(
    "web_clinic.py",
    "medical_analysis.py",
    "dataset.csv",
    "symptom_Description.csv",
    "symptom_precaution.csv",
    "Symptom-severity.csv"
)

Write-Host "Step 2: Upload files to VPS..." -ForegroundColor Green
Write-Host "Run these commands manually in SSH session:" -ForegroundColor Yellow
Write-Host ""
Write-Host "ssh $VPS_USER@$VPS_IP" -ForegroundColor White
Write-Host "mkdir -p $REMOTE_DIR" -ForegroundColor White
Write-Host "cd $REMOTE_DIR" -ForegroundColor White
Write-Host ""

Write-Host "Then from your LOCAL machine in another terminal:" -ForegroundColor Yellow
foreach ($file in $files) {
    Write-Host "scp medical_data_poc/$file ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/" -ForegroundColor White
}

Write-Host ""
Write-Host "Step 3: Install Streamlit on VPS (in SSH session):" -ForegroundColor Green
Write-Host "pip3 install streamlit" -ForegroundColor White
Write-Host ""

Write-Host "Step 4: Start Streamlit with persistence:" -ForegroundColor Green
Write-Host "cd $REMOTE_DIR" -ForegroundColor White
Write-Host "nohup streamlit run web_clinic.py --server.port 8501 --server.address 0.0.0.0 > streamlit.log 2>&1 &" -ForegroundColor White
Write-Host ""

Write-Host "Step 5: Verify it's running:" -ForegroundColor Green
Write-Host "ps aux | grep streamlit" -ForegroundColor White
Write-Host "tail -f streamlit.log" -ForegroundColor White
Write-Host ""

Write-Host "Step 6: Test the URL:" -ForegroundColor Green
Write-Host "http://${VPS_IP}:8501" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== To stop the service later ===" -ForegroundColor Yellow
Write-Host "ps aux | grep streamlit" -ForegroundColor White
Write-Host "kill [PID]" -ForegroundColor White
