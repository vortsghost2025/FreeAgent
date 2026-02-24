# Setup Local Ollama for FREE AI Ensemble
# Run this script on your Windows machine (SEANSBEAST)

Write-Host "🚀 Setting up Local Ollama for FREE AI Ensemble" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check if Ollama is installed
$ollamaPath = Get-Command ollama -ErrorAction SilentlyContinue

if (-not $ollamaPath) {
    Write-Host "📥 Ollama not found. Please install from https://ollama.ai" -ForegroundColor Yellow
    Write-Host "After installation, run this script again." -ForegroundColor Yellow
    Start-Process "https://ollama.ai"
    exit 1
}

Write-Host "✅ Ollama found at: $($ollamaPath.Source)" -ForegroundColor Green

# Check if Ollama is running
$ollamaProcess = Get-Process ollama -ErrorAction SilentlyContinue

if (-not $ollamaProcess) {
    Write-Host "🔄 Starting Ollama service..." -ForegroundColor Yellow
    Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

Write-Host "✅ Ollama service is running" -ForegroundColor Green

# Pull required models for the 8-agent ensemble
$models = @(
    @{name="llama3.2:8b"; agent="AG1 CodeGen, AG8 DevOps"},
    @{name="phi3:3.8b"; agent="AG4 Testing"},
    @{name="deepseek-coder:6.7b"; agent="AG7 Database"},
    @{name="codellama:7b"; agent="AG5 Security (backup)"},
    @{name="mistral:7b"; agent="AG2 DataEng (backup)"}
)

Write-Host ""
Write-Host "📦 Pulling models for 8-Agent Ensemble..." -ForegroundColor Cyan
Write-Host "This may take a while depending on your internet speed." -ForegroundColor Yellow
Write-Host ""

foreach ($model in $models) {
    Write-Host "📥 Pulling $($model.name) for $($model.agent)..." -ForegroundColor White
    
    try {
        $result = ollama pull $model.name 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ $($model.name) ready" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ $($model.name) may have issues: $result" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ❌ Failed to pull $($model.name): $_" -ForegroundColor Red
    }
}

# Verify models
Write-Host ""
Write-Host "📋 Verifying installed models..." -ForegroundColor Cyan
$installedModels = ollama list 2>&1

Write-Host $installedModels

# Test Ollama API
Write-Host ""
Write-Host "🧪 Testing Ollama API..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get
    Write-Host "✅ Ollama API is responding" -ForegroundColor Green
    Write-Host "   Models available: $($response.models.Count)" -ForegroundColor White
} catch {
    Write-Host "❌ Ollama API test failed: $_" -ForegroundColor Red
}

# Create environment file
Write-Host ""
Write-Host "📝 Creating environment configuration..." -ForegroundColor Cyan

$envContent = @"
# FREE AI Ensemble - Local Configuration
# Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Local Ollama
OLLAMA_URL=http://localhost:11434

# LM Studio (if installed)
LMSTUDIO_URL=http://localhost:1234/v1

# Free API Keys (get these from the providers)
# GROQ_API_KEY=your_free_groq_key
# OPENROUTER_API_KEY=your_free_openrouter_key
# HUGGINGFACE_API_KEY=your_free_hf_key
# CLOUDFLARE_ACCOUNT_ID=your_account_id
# CLOUDFLARE_API_KEY=your_api_key

# VPS Endpoints (update with your VPS IPs)
# ORACLE_VPS_URL=http://your-oracle-vps:11434
# HOSTINGER_VPS_URL=http://your-hostinger-vps:11434
# ALIBABA_ECS_URL=http://your-alibaba-ecs:11434
"@

$envPath = Join-Path $PSScriptRoot "..\..\.env.local"
$envContent | Out-File -FilePath $envPath -Encoding UTF8
Write-Host "✅ Environment file created at: $envPath" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🎉 Local Ollama Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your local machine is ready to run:" -ForegroundColor White
Write-Host "  • AG1: Code Generation (llama3.2:8b)" -ForegroundColor White
Write-Host "  • AG4: Testing (phi3:3.8b)" -ForegroundColor White
Write-Host "  • AG7: Database (deepseek-coder:6.7b)" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Get free API keys from Groq, OpenRouter, HuggingFace" -ForegroundColor White
Write-Host "  2. Update .env.local with your API keys" -ForegroundColor White
Write-Host "  3. Deploy Ollama to your VPS instances" -ForegroundColor White
Write-Host "  4. Run: npm run ensemble" -ForegroundColor White
Write-Host ""
Write-Host "💰 Total Cost: `$0.00 (All FREE!)" -ForegroundColor Green
