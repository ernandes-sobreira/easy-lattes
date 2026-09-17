$ErrorActionPreference = 'Stop'

Write-Host "" 
Write-Host "EASY LATTES — ATIVACAO DO BACKEND" -ForegroundColor Green
Write-Host "Este assistente instala/deploya as funcoes e salva a chave OpenAI no Secret Manager." -ForegroundColor White
Write-Host "A chave NAO sera gravada no GitHub nem em arquivo permanente." -ForegroundColor Yellow
Write-Host ""

$projectId = Read-Host "Digite o ID do projeto Firebase do Easy Lattes"
if ([string]::IsNullOrWhiteSpace($projectId)) { throw "ID do projeto Firebase vazio." }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js nao encontrado. Instale Node.js LTS e rode este arquivo novamente." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "npm nao encontrado. Reinstale Node.js LTS e rode novamente." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
  Write-Host "Instalando Firebase CLI..." -ForegroundColor Cyan
  npm install -g firebase-tools
}

Write-Host "Abrindo login do Firebase..." -ForegroundColor Cyan
firebase login

$secure = Read-Host "Cole a chave da OpenAI (ela ficara oculta)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
if ([string]::IsNullOrWhiteSpace($apiKey)) { throw "Chave OpenAI vazia." }

$tmp = Join-Path $env:TEMP ("easy-lattes-openai-" + [guid]::NewGuid().ToString() + ".txt")
try {
  [System.IO.File]::WriteAllText($tmp, $apiKey, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Salvando OPENAI_API_KEY no Google Secret Manager..." -ForegroundColor Cyan
  firebase functions:secrets:set OPENAI_API_KEY --data-file "$tmp" --project "$projectId"
} finally {
  if (Test-Path $tmp) { Remove-Item $tmp -Force }
  $apiKey = $null
}

Write-Host "Instalando dependencias do backend..." -ForegroundColor Cyan
Push-Location (Join-Path $PSScriptRoot "functions")
try {
  npm install
} finally {
  Pop-Location
}

Write-Host "Publicando funcoes do Easy Lattes..." -ForegroundColor Cyan
firebase deploy --project "$projectId" --only "functions:health,functions:careerAnalysis,functions:careerAnalysisDeep,functions:academicAnalysisV8,functions:webDiscovery"

Write-Host ""
Write-Host "PRONTO." -ForegroundColor Green
Write-Host "Agora abra o Easy Lattes > Sistema e informe somente este ID:" -ForegroundColor White
Write-Host $projectId -ForegroundColor Yellow
Write-Host ""
Write-Host "URLs esperadas:" -ForegroundColor White
Write-Host "https://southamerica-east1-$projectId.cloudfunctions.net/health"
Write-Host "https://southamerica-east1-$projectId.cloudfunctions.net/careerAnalysis"
Write-Host "https://southamerica-east1-$projectId.cloudfunctions.net/careerAnalysisDeep"
Write-Host "https://southamerica-east1-$projectId.cloudfunctions.net/academicAnalysisV8"
Write-Host "https://southamerica-east1-$projectId.cloudfunctions.net/webDiscovery"
