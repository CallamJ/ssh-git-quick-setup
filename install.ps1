#Requires -Version 5.1
<#
.SYNOPSIS
    Git and SSH Multi-Account Setup Script for Windows
.DESCRIPTION
    Configures Git hooks and SSH keys for managing multiple Git accounts
.PARAMETER Accounts
    Account configurations in format "pattern:name:email"
.EXAMPLE
    .\setup-git-accounts.ps1 "gh-personal:John Doe:john@example.com" "gh-work:John Doe:john@business.com"
#>

param(
    [Parameter(Mandatory=$true, ValueFromRemainingArguments=$true)]
    [string[]]$Accounts
)

$ErrorActionPreference = "Stop"

# ============================
# Validate Input
# ============================
if ($Accounts.Count -eq 0) {
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\setup-git-accounts.ps1 'pattern:name:email' ['pattern:name:email' ...]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Yellow
    Write-Host "  .\setup-git-accounts.ps1 'gh-personal:John Doe:john@example.com' 'gh-work:Jane Smith:jane@business.com'" -ForegroundColor Yellow
    exit 1
}

# Validate account format
foreach ($account in $Accounts) {
    if ($account -notmatch '^[^:]+:[^:]+:[^:]+$') {
        Write-Host "Invalid account format: $account" -ForegroundColor Red
        Write-Host "Expected: pattern:name:email" -ForegroundColor Red
        exit 1
    }
}

# Paths
$HOOKS_PATH = Join-Path $env:USERPROFILE ".git-hooks"
$SSH_PATH = Join-Path $env:USERPROFILE ".ssh"

# ============================
# Helper Functions
# ============================
function Print-Header {
    param([string]$Message)
    Write-Host "`n===================================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "===================================================`n" -ForegroundColor Blue
}

function Print-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Print-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

# ============================
# Setup Functions
# ============================
function Check-Dependencies {
    Print-Header "Checking Dependencies"
    $missing = @()

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        $missing += "git"
    }
    if (-not (Get-Command ssh-keygen -ErrorAction SilentlyContinue)) {
        $missing += "ssh-keygen (OpenSSH)"
    }

    if ($missing.Count -ne 0) {
        Print-Error "Missing required dependencies: $($missing -join ', ')"
        Write-Host "`nTo install OpenSSH on Windows:" -ForegroundColor Yellow
        Write-Host "  Settings > Apps > Optional Features > Add OpenSSH Client" -ForegroundColor Yellow
        exit 1
    }

    Print-Success "All dependencies found"
}

function Create-HooksDirectory {
    Print-Header "Step 1: Creating Global Git Hooks Directory"
    Print-Info "Global hooks path: $HOOKS_PATH"

    if (Test-Path $HOOKS_PATH) {
        Print-Warning "Hooks directory already exists"
    } else {
        New-Item -ItemType Directory -Path $HOOKS_PATH -Force | Out-Null
        Print-Success "Created hooks directory"
    }
}

function Generate-HookScript {
    # Bash script that works with Git Bash on Windows
    # Using Windows-style path conversion
    $script = @'
#!/bin/bash
remote_url=$(git config --get remote.origin.url)

'@

    $first = $true
    foreach ($account in $Accounts) {
        $parts = $account -split ':', 3
        $pattern = $parts[0]
        $name = $parts[1]
        $email = $parts[2]

        if ($first) {
            $script += @"
if [[ `$remote_url == *"$pattern"* ]]; then
    git config user.name "$name"
    git config user.email "$email"

"@
            $first = $false
        } else {
            $script += @"
elif [[ `$remote_url == *"$pattern"* ]]; then
    git config user.name "$name"
    git config user.email "$email"

"@
        }
    }

    $script += @"
fi
exit 0
"@

    return $script
}

function Create-Hook {
    param(
        [string]$Name,
        [string]$Step
    )

    Print-Header $Step
    $hookFile = Join-Path $HOOKS_PATH $Name
    Print-Info "Creating $Name hook"

    $hookContent = Generate-HookScript
    # Write with LF line endings for Git Bash compatibility
    [System.IO.File]::WriteAllText($hookFile, $hookContent, (New-Object System.Text.UTF8Encoding $false))

    Print-Success "$Name hook created"
}

function Configure-GitHooks {
    Print-Header "Step 5: Configuring Git Global Hooks"
    git config --global core.hooksPath $HOOKS_PATH
    Print-Success "Global Git hooks configured"
}

function Add-GitAlias {
    Print-Header "Step 6: Adding Git Alias"
    $postCheckoutPath = Join-Path $HOOKS_PATH "post-checkout"
    # Convert to Unix-style path for Git Bash
    $postCheckoutUnix = $postCheckoutPath -replace '\\','/'
    git config --global alias.set-identity "!bash `"$postCheckoutUnix`""
    Print-Success "Added 'git set-identity' alias"
}

function Generate-SshKeys {
    Print-Header "Step 7: Generating SSH Keys"

    if (-not (Test-Path $SSH_PATH)) {
        New-Item -ItemType Directory -Path $SSH_PATH -Force | Out-Null
    }

    foreach ($account in $Accounts) {
        $parts = $account -split ':', 3
        $pattern = $parts[0]
        $name = $parts[1]
        $email = $parts[2]

        $keyPath = Join-Path $SSH_PATH "id_ed25519_$pattern"

        if (Test-Path $keyPath) {
            Print-Warning "SSH key exists, skipping: $keyPath"
            continue
        }

        Print-Info "Generating SSH key for $pattern ($email)"

        # Use empty passphrase
        $output = & ssh-keygen -t ed25519 -C $email -f $keyPath -N '""' 2>&1

        if ($LASTEXITCODE -eq 0) {
            Print-Success "Generated SSH key: $keyPath"
        } else {
            Print-Error "Failed to generate SSH key for $pattern"
            Write-Host $output -ForegroundColor Red
        }
    }
}

function Configure-Ssh {
    Print-Header "Step 8: Configuring SSH"
    $sshConfig = Join-Path $SSH_PATH "config"

    if (Test-Path $sshConfig) {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backup = "$sshConfig.backup.$timestamp"
        Copy-Item $sshConfig $backup
        Print-Warning "Existing SSH config backed up to $backup"
    }

    $config = @"
# Generated by Git Multi-Account Setup Script
# Generated on: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

"@

    foreach ($account in $Accounts) {
        $parts = $account -split ':', 3
        $pattern = $parts[0]
        $name = $parts[1]
        $email = $parts[2]

        $keyPath = Join-Path $SSH_PATH "id_ed25519_$pattern"

        # Convert Windows backslashes to forward slashes for SSH config
        $keyPathUnix = $keyPath -replace '\\','/'

        $config += @"
# $name ($email)
Host $pattern
    HostName github.com
    User git
    IdentityFile $keyPathUnix
    IdentitiesOnly yes

"@
    }

    Add-Content -Path $sshConfig -Value $config -Encoding UTF8
    Print-Success "SSH configuration updated"
}

function Display-PublicKeys {
    Print-Header "Step 9: Public SSH Keys"
    Print-Info "Copy these keys to your GitHub/GitLab account settings"
    Print-Info "GitHub Settings -> SSH and GPG keys -> New SSH key"
    Write-Host ""

    foreach ($account in $Accounts) {
        $parts = $account -split ':', 3
        $pattern = $parts[0]
        $name = $parts[1]
        $email = $parts[2]

        $pub = Join-Path $SSH_PATH "id_ed25519_$pattern.pub"

        if (Test-Path $pub) {
            Write-Host "--- $name ($pattern) ---" -ForegroundColor Green
            Get-Content $pub
            Write-Host ""
        } else {
            Print-Error "Missing public key: $pub"
        }
    }

    $response = Read-Host "Once you are ready type 'yes' to automatically test your ssh connections or type skip to skip the tests (y/skip)"

        if ($response -ne 'y' -and $response -ne 'Y') {
            Print-Warning "Skipping SSH connection tests"
            Write-Host "You can test the connections later by running:" -ForegroundColor Cyan
            foreach ($account in $Accounts) {
                $parts = $account -split ':'
                $pattern = $parts[0]
                Write-Host "  ssh -T git@$pattern" -ForegroundColor White
            }
            Write-Host ""
            return
        } else {
            Test-SshConnections
        }
}


function Test-SshConnections {
    Print-Header "Step 10: Testing SSH Connections"
    Print-Info "Testing connections (authentication failures are expected if keys aren't added to GitHub yet)"
    Print-Info "Automatically accepting host keys for first-time connections..."
    Write-Host ""

    foreach ($account in $Accounts) {
        $parts = $account -split ':', 3
        $pattern = $parts[0]

        Print-Info "Testing $pattern..."
        Write-Host ""

        # Temporarily allow errors for SSH command
        $oldErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"

        try {
            # Capture all output (stdout and stderr combined)
            $output = & ssh -T -o StrictHostKeyChecking=accept-new "git@$pattern" 2>&1

            # Display the output, filtering out the "Permanently added" warning
            if ($output) {
                foreach ($line in $output) {
                    $lineStr = $line.ToString()
                    # Skip the "Permanently added" warning, show everything else
                    if ($lineStr -notmatch "Permanently added.*to the list of known hosts") {
                        Write-Host "  $lineStr" -ForegroundColor Gray
                    }
                }
            } else {
                Write-Host "  No response received" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "  Unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        finally {
            $ErrorActionPreference = $oldErrorActionPreference
        }

        Write-Host ""
    }
}

function Display-Usage {
    Print-Header "Setup Complete!"

    Write-Host "Clone repositories using these patterns:" -ForegroundColor Cyan
    Write-Host ""

    foreach ($account in $Accounts) {
        $parts = $account -split ':', 3
        $pattern = $parts[0]
        $name = $parts[1]

        Write-Host "  $name ($pattern):" -ForegroundColor Yellow
        Write-Host "    git clone git@${pattern}:username/repo.git"
        Write-Host ""
    }

    Write-Host "To manually set identity in a repository:" -ForegroundColor Cyan
    Write-Host "  git set-identity"
    Write-Host ""
}

# ============================
# Main Execution
# ============================
function Main {
    Write-Host @"

===========================================
  Git and SSH Multi-Account Setup Script
  Windows PowerShell Edition
===========================================

"@ -ForegroundColor Blue

    try {
        Check-Dependencies
        Create-HooksDirectory
        Create-Hook "pre-push" "Step 2: Creating Pre-Push Hook"
        Create-Hook "pre-commit" "Step 3: Creating Pre-Commit Hook"
        Create-Hook "post-checkout" "Step 4: Creating Post-Checkout Hook"
        Configure-GitHooks
        Add-GitAlias
        Generate-SshKeys
        Configure-Ssh
        Display-PublicKeys
        Display-Usage

        Write-Host "[OK] Setup completed successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "`n[ERROR] Setup failed with error:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }
}

# Run the script
Main