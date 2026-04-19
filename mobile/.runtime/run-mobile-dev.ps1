$ErrorActionPreference = 'Stop'

Set-Location 'd:\mainprojects\codewave\mobile'
$env:CI = '1'
npx expo start --lan --clear --port 8081
