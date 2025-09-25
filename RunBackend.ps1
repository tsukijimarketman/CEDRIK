function Load-DotEnv {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        throw "File not found: $Path"
    }

    Get-Content $Path | ForEach-Object {
        # ignore blank lines and comments
        if ($_ -match '^\s*$' -or $_ -match '^\s*#') { return }

        # split on first '=' only
        if ($_ -match '^\s*([^=]+?)\s*=\s*(.*)$') {
            $key   = $matches[1].Trim()
            $value = $matches[2].Trim()

            # set for current process
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}
# [System.Environment]::SetEnvironmentVariable("SERVER_ENCODER_PORT", $null, "Process")
# [System.Environment]::SetEnvironmentVariable("SERVER_MAIN_PORT", $null, "Process")
# [System.Environment]::SetEnvironmentVariable("SERVER_MODEL_PORT", $null, "Process")

function Get-EnvOrDefault {
    param(
        [Parameter(Mandatory)]
        [string]$EnvValue,
        [Parameter(Mandatory)]
        [string]$Default
    )

    if ($null -eq $EnvValue) {
        return "--port ${Default}"
    }

    return "--port ${EnvValue}"
}

Load-DotEnv -Path ./.env

$DebugFlag = ""
$CMDFLAG = "/c" # Auto Close CMD Window when process dies
if ( $null -ne $env:DEBUG ) {
    $DebugFlag = "--debug"
    $CMDFLAG = "/k"
}

.\.venv\Scripts\Activate.ps1

Start-Process -FilePath cmd -ArgumentList `
 $CMDFLAG,"flask --app backend.Apps.Main run ${DebugFlag} --port 5000"
Start-Process -FilePath cmd -ArgumentList `
 $CMDFLAG,"flask --app backend.Apps.Encoder run ${DebugFlag} --no-reload --port 5001"
Start-Process -FilePath cmd -ArgumentList `
 $CMDFLAG,"flask --app backend.Apps.Model run ${DebugFlag} --no-reload --port 5002"