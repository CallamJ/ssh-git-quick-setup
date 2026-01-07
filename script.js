let accountIndexAuto = 1;
let accountIndexManual = 1;

function switchMethod(method) {
    // Update active state on method selectors
    document.querySelectorAll('.method-option').forEach(option => {
        option.classList.remove('active');
    });
    event.target.closest('.method-option').classList.add('active');

    // Show/hide appropriate content
    document.querySelectorAll('.setup-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${method}-setup`).classList.add('active');

    // Clear output when switching methods
    document.getElementById('output').classList.remove('visible');
    document.getElementById('output').innerHTML = '';
}

function addAccount(type) {
    const containerId = type === 'auto' ? 'accountsContainerAuto' : 'accountsContainer';
    const container = document.getElementById(containerId);
    const index = type === 'auto' ? accountIndexAuto++ : accountIndexManual++;

    const newAccount = document.createElement('div');
    newAccount.className = 'account-item';
    newAccount.setAttribute('data-index', index);
    newAccount.innerHTML = `
            <div class="form-group">
                <label>
                    Account Pattern
                    <span class="help-icon">?
                        <span class="tooltip">
                            <div class="tooltip-title">Account Pattern</div>
                            A unique identifier used in your remote URLs to distinguish this account. This becomes the SSH host alias.
                            <div class="tooltip-example">Examples: github-personal, github-work, gitlab-company</div>
                        </span>
                    </span>
                </label>
                <input type="text" class="account-pattern" placeholder="e.g., github-work" required>
            </div>
            <div class="form-group">
                <label>
                    Git Name
                    <span class="help-icon">?
                        <span class="tooltip">
                            <div class="tooltip-title">Git Name</div>
                            Your full name as it will appear in commit messages for this account.
                            <div class="tooltip-example">Example: John Doe, Jane Smith</div>
                        </span>
                    </span>
                </label>
                <input type="text" class="account-name" placeholder="e.g., Work Name" required>
            </div>
            <div class="form-group">
                <label>
                    Git Email
                    <span class="help-icon">?
                        <span class="tooltip">
                            <div class="tooltip-title">Git Email</div>
                            The email address associated with commits for this account. Should match your GitHub/GitLab account email.
                            <div class="tooltip-example">Example: john@example.com</div>
                        </span>
                    </span>
                </label>
                <input type="email" class="account-email" placeholder="e.g., work@company.com" required>
            </div>
            <button class="btn btn-danger" onclick="removeAccount(${index}, '${containerId}')">Remove</button>
        `;
    container.appendChild(newAccount);
}

function removeAccount(index, containerId) {
    const container = document.getElementById(containerId);
    const account = container.querySelector(`[data-index="${index}"]`);
    if (account) {
        account.remove();
    }
}

function getAccounts(type) {
    const containerId = type === 'auto' ? 'accountsContainerAuto' : 'accountsContainer';
    const accounts = [];
    document.querySelectorAll(`#${containerId} .account-item`).forEach(item => {
        const pattern = item.querySelector('.account-pattern').value;
        const name = item.querySelector('.account-name').value;
        const email = item.querySelector('.account-email').value;
        if (pattern && name && email) {
            accounts.push({ pattern, name, email });
        }
    });
    return accounts;
}

function generateAutomatedSetup() {
    const os = document.getElementById('os-auto').value;
    const accounts = getAccounts('auto');

    if (!os || accounts.length === 0) {
        alert('Please fill in all required fields and add at least one account.');
        return;
    }

    // Build the account arguments

    let command = '';
    let commandForCopy = '';
    let instructions = '';

    if (os === 'windows') {
        const accountArgs = accounts.map(acc => `'${acc.pattern}:${acc.name}:${acc.email}'`).join(', ');
        commandForCopy = `$script = irm https://callamj.github.io/ssh-git-quick-setup/install.ps1; Invoke-Expression "& { $script } -Accounts ${accountArgs}"`;
        command = commandForCopy.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const escapedCommand = commandForCopy.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        instructions = `
                <div class="guide-section">
                    <h2><span class="step-number">1</span> Run the Installation Command</h2>
                    <p>Open <strong>PowerShell as Administrator</strong> and run the following command:</p>

                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">PowerShell (Run as Administrator)</span>
                            <button class="copy-btn" data-code="${escapedCommand}" onclick="copyCodeDirect(this)">Copy</button>
                        </div>
                        <pre>${command}</pre>
                    </div>

                    <div class="warning">
                        <div class="warning-title">Important:</div>
                        <p>You must run PowerShell as Administrator for the installation script to work properly.</p>
                    </div>
                </div>
            `;
    } else {
        const accountArgs = accounts.map(acc => `"${acc.pattern}:${acc.name}:${acc.email}"`).join(' ');
        commandForCopy = `curl -fsSL https://callamj.github.io/ssh-git-quick-setup/install.sh | bash -s -- ${accountArgs}`;
        command = commandForCopy.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const escapedCommand = commandForCopy.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        instructions = `
                <div class="guide-section">
                    <h2><span class="step-number">1</span> Run the Installation Command</h2>
                    <p>Open your terminal and run the following command:</p>

                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">Terminal</span>
                            <button class="copy-btn" data-code="${escapedCommand}" onclick="copyCodeDirect(this)">Copy</button>
                        </div>
                        <pre>${command}</pre>
                    </div>
                </div>
            `;
    }

    const guide = `
            ${instructions}

            <div class="guide-section">
                <h2><span class="step-number">2</span> Follow the Script Prompts</h2>
                <p>The installation script will automatically handle everything for you:</p>
                <ul>
                    <li>Create the global Git hooks directory</li>
                    <li>Generate pre-push, pre-commit, and post-checkout hooks</li>
                    <li>Configure Git to use the global hooks</li>
                    <li>Generate SSH keys for each account</li>
                    <li>Configure your SSH config file</li>
                    <li>Add the <code>git set-identity</code> alias for manual setup</li>
                    <li>Guide you through adding SSH keys to GitHub/GitLab</li>
                    <li>Test your SSH connections</li>
                </ul>
            </div>

            <div class="guide-section">
                <h2><span class="step-number">3</span> Using Your Setup</h2>
                <p>Once the installation is complete, you can start using your multi-account setup. When cloning or working with repositories, use the appropriate host alias:</p>

                ${accounts.map(account => `
                    <h3>${account.pattern}</h3>
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">Clone example</span>
                            <button class="copy-btn" onclick='copyCode(this, \`git clone git@${account.pattern}:username/repo.git\`)'>Copy</button>
                        </div>
                        <pre>git clone git@${account.pattern}:username/repo.git</pre>
                    </div>
                `).join('')}

                <h3>For Existing Repositories</h3>
                <p>Update the remote URL to use your host alias:</p>
                <div class="code-block">
                    <div class="code-header">
                        <span class="code-label">Update remote URL</span>
                        <button class="copy-btn" onclick='copyCode(this, \`git remote set-url origin git@PATTERN:username/repo.git\`)'>Copy</button>
                    </div>
                    <pre>git remote set-url origin git@PATTERN:username/repo.git</pre>
                </div>
                <p style="margin-top: 1rem;">Replace <span class="highlight">PATTERN</span> with your account pattern (e.g., ${accounts[0].pattern}) and username and repo with their corresponding values as well.</p>

                <div class="success">
                    <div class="success-title">🎉 All Done!</div>
                    <p>Your Git hooks will automatically manage your identity for each repository based on the remote URL pattern.</p>
                </div>
            </div>
        `;

    document.getElementById('output').innerHTML = guide;
    document.getElementById('output').classList.add('visible');
    document.getElementById('output').scrollIntoView({ behavior: 'smooth' });
}

function getHomePath(os, username) {
    if (os === 'windows') {
        return `C:/Users/${username}`;
    }
    return `~`;
}

function getShellExample(os) {
    if (os === 'windows') {
        return 'PowerShell or Git Bash';
    }
    return 'Terminal';
}

function copyCode(button, code) {
    navigator.clipboard.writeText(code).then(() => {
        const originalText = button.textContent;
        button.textContent = '✓ Copied!';
        button.classList.add('copied');
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    });
}

function copyCodeDirect(button) {
    const code = button.getAttribute('data-code');
    // Decode any HTML entities and handle the text directly
    const textarea = document.createElement('textarea');
    textarea.value = code;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        const originalText = button.textContent;
        button.textContent = '✓ Copied!';
        button.classList.add('copied');
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
        navigator.clipboard.writeText(code).then(() => {
            const originalText = button.textContent;
            button.textContent = '✓ Copied!';
            button.classList.add('copied');
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
        });
    } finally {
        document.body.removeChild(textarea);
    }
}

function switchTab(tabId, tabGroupId) {
    // Hide all tab contents in this group
    const group = document.getElementById(tabGroupId);
    group.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    group.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab content
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

function toggleCollapsible(id) {
    const collapsible = document.getElementById(id);
    collapsible.classList.toggle('open');
}

function generateHookScript(accounts) {
    let script = `#!/bin/sh

# Get the remote URL
remote_url=$(git config --get remote.origin.url)

# Match against patterns and set user config accordingly
`;

    accounts.forEach((account, index) => {
        const condition = index === 0 ? 'if' : 'elif';
        script += `${condition} echo "$remote_url" | grep -q "${account.pattern}"; then
    git config user.name "${account.name}"
    git config user.email "${account.email}"
`;
    });

    script += `fi

exit 0`;

    return script;
}

function generatePreCommitHook(accounts) {
    let script = `#!/bin/sh

# Get the remote URL
remote_url=$(git config --get remote.origin.url)

# Match against patterns and set user config accordingly
`;

    accounts.forEach((account, index) => {
        const condition = index === 0 ? 'if' : 'elif';
        script += `${condition} echo "$remote_url" | grep -q "${account.pattern}"; then
    git config user.name "${account.name}"
    git config user.email "${account.email}"
`;
    });

    script += `fi

exit 0`;

    return script;
}

function generatePostCheckoutHook(accounts) {
    let script = `#!/bin/sh

# Get the remote URL
remote_url=$(git config --get remote.origin.url)

# Match against patterns and set user config accordingly
`;

    accounts.forEach((account, index) => {
        const condition = index === 0 ? 'if' : 'elif';
        script += `${condition} echo "$remote_url" | grep -q "${account.pattern}"; then
    git config user.name "${account.name}"
    git config user.email "${account.email}"
`;
    });

    script += `fi

exit 0`;

    return script;
}

function generateSSHConfig(accounts, os) {
    let config = `# Generated by Git Multi-Account Quick Setup Guide

`;

    accounts.forEach(account => {
        const keyFile = os === 'windows'
            ? `C:/Users/USERNAME/.ssh/id_ed25519_${account.pattern.replace('github-', '').replace('gitlab-', '')}`
            : `~/.ssh/id_ed25519_${account.pattern.replace('github-', '').replace('gitlab-', '')}`;

        config += `# ${account.name} (${account.email})
Host ${account.pattern}
    HostName github.com
    User git
    IdentityFile ${keyFile}
    IdentitiesOnly yes

`;
    });

    return config;
}

function generateGuide() {
    const username = document.getElementById('username').value;
    const os = document.getElementById('os').value;
    const accounts = getAccounts('manual');

    if (!username || !os || accounts.length === 0) {
        alert('Please fill in all required fields and add at least one account.');
        return;
    }

    const homePath = getHomePath(os, username);
    const hooksPath = os === 'windows' ? `${homePath}/.git-hooks` : `~/.git-hooks`;
    const sshPath = os === 'windows' ? `${homePath}/.ssh` : `~/.ssh`;
    const shellExample = getShellExample(os);

    const hookScript = generateHookScript(accounts);
    const preCommitHook = generatePreCommitHook(accounts);
    const postCheckoutHook = generatePostCheckoutHook(accounts);
    const sshConfig = generateSSHConfig(accounts, os);

    const guide = `
                <div class="guide-section">
                    <h2><span class="step-number">1</span> Create Global Git Hooks Directory</h2>
                    <p>First, create a directory to store your global Git hooks:</p>

                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">${shellExample}</span>
                            <button class="copy-btn" onclick='copyCode(this, \`mkdir ${hooksPath}\`)'>Copy</button>
                        </div>
                        <pre>mkdir ${hooksPath}</pre>
                    </div>
                </div>

                <div class="guide-section">
                    <h2><span class="step-number">2</span> Create the Pre-Push Hook</h2>
                    <p>Create and edit a file named <span class="highlight">pre-push</span> (no extension) at <span class="highlight">${hooksPath}/pre-push</span></p>

                    ${os === 'windows' ? `
                    <p>First, create an empty file, then open it in your text editor:</p>

                    <div id="pre-push-create-tabs">
                        <div class="tabs">
                            <button class="tab active" onclick="switchTab('pre-push-notepad', 'pre-push-create-tabs')">Notepad</button>
                            <button class="tab" onclick="switchTab('pre-push-vscode', 'pre-push-create-tabs')">VS Code</button>
                            <button class="tab" onclick="switchTab('pre-push-vscodium', 'pre-push-create-tabs')">VSCodium</button>
                        </div>

                        <div id="pre-push-notepad" class="tab-content active">
                            <div class="code-block">
                                <div class="code-header">
                                    <span class="code-label">PowerShell + Notepad</span>
                                    <button class="copy-btn" onclick='copyCode(this, \`if (!(Test-Path "${hooksPath}/pre-push")) { New-Item -ItemType File -Path "${hooksPath}/pre-push" -Force }\nnotepad "${hooksPath}/pre-push"\`)'>Copy</button>
                                </div>
                                <pre>if (!(Test-Path "${hooksPath}/pre-push")) { New-Item -ItemType File -Path "${hooksPath}/pre-push" -Force }
notepad "${hooksPath}/pre-push"</pre>
                            </div>
                        </div>

                        <div id="pre-push-vscode" class="tab-content">
                            <div class="code-block">
                                <div class="code-header">
                                    <span class="code-label">PowerShell + VS Code</span>
                                    <button class="copy-btn" onclick='copyCode(this, \`code "${hooksPath}/pre-push"\`)'>Copy</button>
                                </div>
                                <pre>code "${hooksPath}/pre-push"</pre>
                            </div>
                        </div>

                        <div id="pre-push-vscodium" class="tab-content">
                            <div class="code-block">
                                <div class="code-header">
                                    <span class="code-label">PowerShell + VSCodium</span>
                                    <button class="copy-btn" onclick='copyCode(this, \`codium "${hooksPath}/pre-push"\`)'>Copy</button>
                                </div>
                                <pre>codium "${hooksPath}/pre-push"</pre>
                            </div>
                        </div>
                    </div>
                    ` : `
                    <p>Use nano or your preferred text editor to create and edit the file:</p>
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">Edit with nano</span>
                            <button class="copy-btn" onclick='copyCode(this, \`nano ${hooksPath}/pre-push\`)'>Copy</button>
                        </div>
                        <pre>nano ${hooksPath}/pre-push</pre>
                    </div>
                    <p style="margin-top: 1rem; color: var(--text-secondary);">After pasting the content, press <span class="highlight">Ctrl+X</span>, then <span class="highlight">Y</span>, then <span class="highlight">Enter</span> to save.</p>
                    `}

                    <p style="margin-top: 1.5rem;">Copy and paste this content into the file:</p>
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">File content</span>
                            <button class="copy-btn" onclick='copyCode(this, \`${hookScript.replace(/`/g, '\\`')}\`)'>Copy</button>
                        </div>
                        <pre>${hookScript.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                    </div>

                    <div class="warning">
                        <div class="warning-title">Important:</div>
                        <p>This script will automatically set your Git name and email based on the remote URL pattern before each push.</p>
                    </div>
                </div>

                <div class="guide-section">
                    <h2><span class="step-number">3</span> Create the Pre-Commit Hook</h2>
                    <p>Create a <span class="highlight">pre-commit</span> hook that runs before each commit:</p>

                    ${os === 'windows' ? `
                    <p>Create a file and open it in your preferred text editor:</p>

                    <div id="pre-commit-create-tabs">
                        <div class="tabs">
                            <button class="tab active" onclick="switchTab('pre-commit-notepad', 'pre-commit-create-tabs')">Notepad</button>
                            <button class="tab" onclick="switchTab('pre-commit-vscode', 'pre-commit-create-tabs')">VS Code</button>
                            <button class="tab" onclick="switchTab('pre-commit-vscodium', 'pre-commit-create-tabs')">VSCodium</button>
                        </div>

                        <div id="pre-commit-notepad" class="tab-content active">
                            <div class="code-block">
                                <div class="code-header">
                                    <span class="code-label">PowerShell + Notepad</span>
                                    <button class="copy-btn" onclick='copyCode(this, \`if (!(Test-Path "${hooksPath}/pre-commit")) { New-Item -ItemType File -Path "${hooksPath}/pre-commit" -Force }\nnotepad "${hooksPath}/pre-commit"\`)'>Copy</button>
                                </div>
                                <pre>if (!(Test-Path "${hooksPath}/pre-commit")) { New-Item -ItemType File -Path "${hooksPath}/pre-commit" -Force }
notepad "${hooksPath}/pre-commit"</pre>
                            </div>
                        </div>

                        <div id="pre-commit-vscode" class="tab-content">
                            <div class="code-block">
                                <div class="code-header">
                                    <span class="code-label">PowerShell + VS Code</span>
                                    <button class="copy-btn" onclick='copyCode(this, \`code "${hooksPath}/pre-commit"\`)'>Copy</button>
                                </div>
                                <pre>code "${hooksPath}/pre-commit"</pre>
                            </div>
                        </div>

                        <div id="pre-commit-vscodium" class="tab-content">
                            <div class="code-block">
                                <div class="code-header">
                                    <span class="code-label">PowerShell + VSCodium</span>
                                    <button class="copy-btn" onclick='copyCode(this, \`codium "${hooksPath}/pre-commit"\`)'>Copy</button>
                                </div>
                                <pre>codium "${hooksPath}/pre-commit"</pre>
                            </div>
                        </div>
                    </div>
                    ` : `
                    <p>Use nano or your preferred text editor to create and edit the file:</p>
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">Edit with nano</span>
                            <button class="copy-btn" onclick='copyCode(this, \`nano ${hooksPath}/pre-commit\`)'>Copy</button>
                        </div>
                        <pre>nano ${hooksPath}/pre-commit</pre>
                    </div>
                    <p style="margin-top: 1rem; color: var(--text-secondary);">After pasting the content, press <span class="highlight">Ctrl+X</span>, then <span class="highlight">Y</span>, then <span class="highlight">Enter</span> to save.</p>
                    `}

                    <p style="margin-top: 1.5rem;">Copy and paste this content into the file:</p>
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">File content</span>
                            <button class="copy-btn" onclick='copyCode(this, \`${preCommitHook.replace(/`/g, '\\`')}\`)'>Copy</button>
                        </div>
                        <pre>${preCommitHook.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                    </div>
                </div>

                <div class="guide-section">
                    <h2><span class="step-number">4</span> Create the Post-Checkout Hook</h2>
                    <p>This hook runs after cloning or checking out branches, automatically setting your identity:</p>

                    ${os === 'windows' ? `
                    <p>First, create an empty file, then open it in your text editor:</p>

                    <div id="post-checkout-create-tabs">
                        <div class="tabs">
                            <button class="tab active" onclick="switchTab('post-checkout-notepad', 'post-checkout-create-tabs')">Notepad</button>
                            <button class="tab" onclick="switchTab('post-checkout-vscode', 'post-checkout-create-tabs')">VS Code</button>
                            <button class="tab" onclick="switchTab('post-checkout-vscodium', 'post-checkout-create-tabs')">VSCodium</button>
                        </div>

                        <div id="post-checkout-notepad" class="tab-content active">
                            <div class="code-block">
                                <div class="code-header">
                                    <span class="code-label">PowerShell + Notepad</span>
                                    <button class="copy-btn" onclick='copyCode(this, \`if (!(Test-Path "${hooksPath}/post-checkout")) { New-Item -ItemType File -Path "${hooksPath}/post-checkout" -Force }\nnotepad "${hooksPath}/post-checkout"\`)'>Copy</button>
                                </div>
                                <pre>if (!(Test-Path "${hooksPath}/post-checkout")) { New-Item -ItemType File -Path "${hooksPath}/post-checkout" -Force }
notepad "${hooksPath}/post-checkout"</pre>
                            </div>
                        </div>

                        <div id="post-checkout-vscode" class="tab-content">
                            <div class="code-block">
                                <div class="code-header">
                                    <span class="code-label">PowerShell + VS Code</span>
                                    <button class="copy-btn" onclick='copyCode(this, \`code "${hooksPath}/post-checkout"\`)'>Copy</button>
                                </div>
                                <pre>code "${hooksPath}/post-checkout"</pre>
                            </div>
                        </div>

                        <div id="post-checkout-vscodium" class="tab-content">
                            <div class="code-block">
                                <div class="code-header">
                                    <span class="code-label">PowerShell + VSCodium</span>
                                    <button class="copy-btn" onclick='copyCode(this, \`codium "${hooksPath}/post-checkout"\`)'>Copy</button>
                                </div>
                                <pre>codium "${hooksPath}/post-checkout"</pre>
                            </div>
                        </div>
                    </div>
                    ` : `
                    <p>Use nano or your preferred text editor to create and edit the file:</p>
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">Edit with nano</span>
                            <button class="copy-btn" onclick='copyCode(this, \`nano ${hooksPath}/post-checkout\`)'>Copy</button>
                        </div>
                        <pre>nano ${hooksPath}/post-checkout</pre>
                    </div>
                    <p style="margin-top: 1rem; color: var(--text-secondary);">After pasting the content, press <span class="highlight">Ctrl+X</span>, then <span class="highlight">Y</span>, then <span class="highlight">Enter</span> to save.</p>
                    `}

                    <p style="margin-top: 1.5rem;">Copy and paste this content into the file:</p>
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">File content</span>
                            <button class="copy-btn" onclick='copyCode(this, \`${postCheckoutHook.replace(/`/g, '\\`')}\`)'>Copy</button>
                        </div>
                        <pre>${postCheckoutHook.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                    </div>
                </div>

                ${os !== 'windows' ? `
                <div class="guide-section">
                    <h2><span class="step-number">5</span> Make the Hooks Executable</h2>
                    <p>Run the following commands to make all hooks executable:</p>

                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">${shellExample}</span>
                            <button class="copy-btn" onclick='copyCode(this, \`chmod +x ${hooksPath}/pre-push\nchmod +x ${hooksPath}/pre-commit\nchmod +x ${hooksPath}/post-checkout\`)'>Copy</button>
                        </div>
                        <pre>chmod +x ${hooksPath}/pre-push
chmod +x ${hooksPath}/pre-commit
chmod +x ${hooksPath}/post-checkout</pre>
                    </div>
                </div>
                ` : ''}

                <div class="guide-section">
                    <h2><span class="step-number">${os !== 'windows' ? '6' : '5'}</span> Configure Git to Use Global Hooks</h2>
                    <p>Tell Git to use your global hooks directory:</p>

                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">${shellExample}</span>
                            <button class="copy-btn" onclick='copyCode(this, \`git config --global core.hooksPath ${hooksPath}\`)'>Copy</button>
                        </div>
                        <pre>git config --global core.hooksPath ${hooksPath}</pre>
                    </div>

                    <div class="success">
                        <div class="success-title">✓ Part 1 Complete!</div>
                        <p>Your Git hooks are now configured. Next, we'll set up SSH keys for each account.</p>
                    </div>
                </div>

                <div class="guide-section">
                    <h2><span class="step-number">${os !== 'windows' ? '7' : '6'}</span> Add Git Alias for Manual Setup</h2>
                    <p>Add a convenient Git command to manually set your identity in any repo:</p>

                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">Add Git alias</span>
                            <button class="copy-btn" onclick='copyCode(this, \`git config --global alias.set-identity "!${hooksPath}/post-checkout"\`)'>Copy</button>
                        </div>
                        <pre>git config --global alias.set-identity "!${hooksPath}/post-checkout"</pre>
                    </div>

                    <p style="margin-top: 1rem;">Now you can run <span class="highlight">git set-identity</span> in any repo to set up your user config based on the remote URL. This is highly recommended for use with IDEs that do not trigger pre-commit scripts before checking user identity.</p>

                    <div class="success">
                        <div class="success-title">Usage</div>
                        <p>This is useful for:</p>
                        <ul>
                            <li>Existing repos before you set up hooks</li>
                            <li>Repos where the hook didn't run automatically</li>
                            <li>Quick manual identity switching</li>
                        </ul>
                        <p style="margin-top: 0.5rem;">Just run: <code>git set-identity</code></p>
                    </div>
                </div>

                <div class="guide-section">
                    <h2><span class="step-number">${os !== 'windows' ? '8' : '7'}</span> Generate SSH Keys</h2>
                    <p>Generate a unique SSH key for each of your accounts:</p>

                    ${accounts.map(account => {
        const keyName = account.pattern.replace('github-', '').replace('gitlab-', '');
        const keyPath = os === 'windows' ? `${homePath}/.ssh/id_ed25519_${keyName}` : `~/.ssh/id_ed25519_${keyName}`;
        return `
                        <div class="code-block">
                            <div class="code-header">
                                <span class="code-label">${account.pattern} key</span>
                                <button class="copy-btn" onclick='copyCode(this, \`ssh-keygen -t ed25519 -C "${account.email}" -f ${keyPath}\`)'>Copy</button>
                            </div>
                            <pre>ssh-keygen -t ed25519 -C "${account.email}" -f ${keyPath}</pre>
                        </div>
                        `;
    }).join('')}

                    <div class="warning">
                        <div class="warning-title">Note:</div>
                        <p>When prompted, you can press Enter twice to skip setting a passphrase.</p>
                    </div>

                    ${os === 'windows' ? `
                    <div class="collapsible" id="ssh-keygen-help">
                        <div class="collapsible-header" onclick="toggleCollapsible('ssh-keygen-help')">
                            <span class="collapsible-icon">▶</span>
                            <span class="collapsible-title">Help: Getting "No such file or directory" error?</span>
                        </div>
                        <div class="collapsible-content">
                            <div class="collapsible-inner">
                                <p>If ssh-keygen fails because the target files don't exist, create empty key files first:</p>

                                <div id="ssh-fix-tabs">
                                    <div class="tabs">
                                        <button class="tab active" onclick="switchTab('powershell-tab', 'ssh-fix-tabs')">PowerShell</button>
                                        <button class="tab" onclick="switchTab('cmd-tab', 'ssh-fix-tabs')">CMD</button>
                                    </div>

                                    <div id="powershell-tab" class="tab-content active">
                                        <div class="code-block">
                                            <div class="code-header">
                                                <span class="code-label">PowerShell</span>
                                                <button class="copy-btn" onclick='copyCode(this, \`${accounts.map(account => {
        const keyName = account.pattern.replace('github-', '').replace('gitlab-', '');
        return `New-Item -ItemType File -Path "${homePath}/.ssh/id_ed25519_${keyName}" -Force\nNew-Item -ItemType File -Path "${homePath}/.ssh/id_ed25519_${keyName}.pub" -Force`;
    }).join('\n')}\`)'>Copy</button>
                                            </div>
                                            <pre>${accounts.map(account => {
        const keyName = account.pattern.replace('github-', '').replace('gitlab-', '');
        return `New-Item -ItemType File -Path "${homePath}/.ssh/id_ed25519_${keyName}" -Force\nNew-Item -ItemType File -Path "${homePath}/.ssh/id_ed25519_${keyName}.pub" -Force`;
    }).join('\n')}</pre>
                                        </div>
                                    </div>

                                    <div id="cmd-tab" class="tab-content">
                                        <div class="code-block">
                                            <div class="code-header">
                                                <span class="code-label">CMD</span>
                                                <button class="copy-btn" onclick='copyCode(this, \`${accounts.map(account => {
        const keyName = account.pattern.replace('github-', '').replace('gitlab-', '');
        return `type nul > "${homePath}/.ssh/id_ed25519_${keyName}"\ntype nul > "${homePath}/.ssh/id_ed25519_${keyName}.pub"`;
    }).join('\n')}\`)'>Copy</button>
                                            </div>
                                            <pre>${accounts.map(account => {
        const keyName = account.pattern.replace('github-', '').replace('gitlab-', '');
        return `type nul > "${homePath}/.ssh/id_ed25519_${keyName}"\ntype nul > "${homePath}/.ssh/id_ed25519_${keyName}.pub"`;
    }).join('\n')}</pre>
                                        </div>
                                    </div>
                                </div>
                                <p style="margin-top: 1rem;">After creating the files, run the ssh-keygen commands again.</p>
                            </div>
                        </div>
                    </div>
                    ` : `
                    <div class="collapsible" id="ssh-keygen-help">
                        <div class="collapsible-header" onclick="toggleCollapsible('ssh-keygen-help')">
                            <span class="collapsible-icon">▶</span>
                            <span class="collapsible-title">Help: Getting "No such file or directory" error?</span>
                        </div>
                        <div class="collapsible-content">
                            <div class="collapsible-inner">
                                <p>If ssh-keygen fails because the target files don't exist, create empty key files first:</p>
                                <div class="code-block" style="margin-top: 0.5rem;">
                                    <div class="code-header">
                                        <span class="code-label">Create empty key files</span>
                                        <button class="copy-btn" onclick='copyCode(this, \`${accounts.map(account => {
        const keyName = account.pattern.replace('github-', '').replace('gitlab-', '');
        return `touch ~/.ssh/id_ed25519_${keyName}\ntouch ~/.ssh/id_ed25519_${keyName}.pub`;
    }).join('\n')}\`)'>Copy</button>
                                    </div>
                                    <pre>${accounts.map(account => {
        const keyName = account.pattern.replace('github-', '').replace('gitlab-', '');
        return `touch ~/.ssh/id_ed25519_${keyName}\ntouch ~/.ssh/id_ed25519_${keyName}.pub`;
    }).join('\n')}</pre>
                                </div>
                                <p style="margin-top: 1rem;">After creating the files, run the ssh-keygen commands again.</p>
                            </div>
                        </div>
                    </div>
                    `}
                </div>

                <div class="guide-section">
                    <h2><span class="step-number">${os !== 'windows' ? '9' : '8'}</span> Configure SSH</h2>
                    <p>Create or edit your SSH config file at <span class="highlight">${sshPath}/config</span></p>

                    ${os === 'windows' ? `
                    <p>Create a config file and open in your text editor:</p>

                    <div id="ssh-config-create-tabs">
                        <div class="tabs">
                            <button class="tab active" onclick="switchTab('ssh-config-notepad', 'ssh-config-create-tabs')">Notepad</button>
                            <button class="tab" onclick="switchTab('ssh-config-vscode', 'ssh-config-create-tabs')">VS Code</button>
                            <button class="tab" onclick="switchTab('ssh-config-vscodium', 'ssh-config-create-tabs')">VSCodium</button>
                        </div>

                        <div id="ssh-config-notepad" class="tab-content active">
                            <div class="code-block">
                                <div class="code-header">
                                    <span class="code-label">PowerShell + Notepad</span>
                                    <button class="copy-btn" onclick='copyCode(this, \`if (!(Test-Path "${sshPath}/config")) { New-Item -ItemType File -Path "${sshPath}/config" -Force }\nnotepad "${sshPath}/config"\`)'>Copy</button>
                                </div>
                                <pre>if (!(Test-Path "${sshPath}/config")) { New-Item -ItemType File -Path "${sshPath}/config" -Force }
notepad "${sshPath}/config"</pre>
                            </div>
                        </div>

                        <div id="ssh-config-vscode" class="tab-content">
                            <div class="code-block">
                                <div class="code-header">
                                    <span class="code-label">PowerShell + VS Code</span>
                                    <button class="copy-btn" onclick='copyCode(this, \`code "${sshPath}/config"\`)'>Copy</button>
                                </div>
                                <pre>code "${sshPath}/config"</pre>
                            </div>
                        </div>

                        <div id="ssh-config-vscodium" class="tab-content">
                            <div class="code-block">
                                <div class="code-header">
                                    <span class="code-label">PowerShell + VSCodium</span>
                                    <button class="copy-btn" onclick='copyCode(this, \`codium "${sshPath}/config"\`)'>Copy</button>
                                </div>
                                <pre>codium "${sshPath}/config"</pre>
                            </div>
                        </div>
                    </div>
                    ` : `
                    <p>Use nano or your preferred text editor:</p>
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">Edit with nano</span>
                            <button class="copy-btn" onclick='copyCode(this, \`nano ${sshPath}/config\`)'>Copy</button>
                        </div>
                        <pre>nano ${sshPath}/config</pre>
                    </div>
                    <p style="margin-top: 1rem; color: var(--text-secondary);">After pasting the content, press <span class="highlight">Ctrl+X</span>, then <span class="highlight">Y</span>, then <span class="highlight">Enter</span> to save.</p>
                    `}

                    <p style="margin-top: 1.5rem;">Copy and paste this content into the file:</p>
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">File content</span>
                            <button class="copy-btn" onclick='copyCode(this, \`${sshConfig.replace(/`/g, '\\`').replace(/USERNAME/g, username)}\`)'>Copy</button>
                        </div>
                        <pre>${sshConfig.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/USERNAME/g, username)}</pre>
                    </div>
                </div>

                <div class="guide-section">
                    <h2><span class="step-number">${os !== 'windows' ? '10' : '9'}</span> Add Public Keys to GitHub</h2>
                    <p>For each account, copy the public key and add it to GitHub:</p>

                    ${accounts.map(account => {
        const keyName = account.pattern.replace('github-', '').replace('gitlab-', '');
        const keyPath = os === 'windows' ? `${homePath}/.ssh/id_ed25519_${keyName}.pub` : `~/.ssh/id_ed25519_${keyName}.pub`;
        return `
                        <h3>${account.name} (${account.pattern})</h3>
                        <div class="code-block">
                            <div class="code-header">
                                <span class="code-label">Display public key</span>
                                <button class="copy-btn" onclick='copyCode(this, \`cat ${keyPath}\`)'>Copy</button>
                            </div>
                            <pre>cat ${keyPath}</pre>
                        </div>
                        <p>Then:</p>
                        <ul>
                            <li>Go to GitHub → Settings → SSH and GPG keys → New SSH key</li>
                            <li>Paste the public key content</li>
                            <li>Save</li>
                        </ul>
                        `;
    }).join('')}
                </div>

                <div class="guide-section">
                    <h2><span class="step-number">${os !== 'windows' ? '11' : '10'}</span> Test Your Setup</h2>
                    <p>Test each SSH connection:</p>

                    ${accounts.map(account => `
                        <div class="code-block">
                            <div class="code-header">
                                <span class="code-label">Test ${account.pattern}</span>
                                <button class="copy-btn" onclick='copyCode(this, \`ssh -T git@${account.pattern}\`)'>Copy</button>
                            </div>
                            <pre>ssh -T git@${account.pattern}</pre>
                        </div>
                    `).join('')}

                    <div class="success">
                        <div class="success-title">Expected Output:</div>
                        <p>Hi [username]! You've successfully authenticated, but GitHub does not provide shell access.</p>
                    </div>
                </div>

                <div class="guide-section">
                    <h2><span class="step-number">${os !== 'windows' ? '12' : '11'}</span> Using Your Setup</h2>
                    <p>When cloning or working with repositories, use the appropriate host alias:</p>

                    ${accounts.map(account => `
                        <h3>${account.pattern}</h3>
                        <div class="code-block">
                            <div class="code-header">
                                <span class="code-label">Clone example</span>
                                <button class="copy-btn" onclick='copyCode(this, \`git clone git@${account.pattern}:username/repo.git\`)'>Copy</button>
                            </div>
                            <pre>git clone git@${account.pattern}:username/repo.git</pre>
                        </div>
                    `).join('')}

                    <h3>For Existing Repositories</h3>
                    <p>Update the remote URL to use your host alias:</p>
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">Update remote URL</span>
                            <button class="copy-btn" onclick='copyCode(this, \`git remote set-url origin git@PATTERN:username/repo.git\`)'>Copy</button>
                        </div>
                        <pre>git remote set-url origin git@PATTERN:username/repo.git</pre>
                    </div>
                    <p style="margin-top: 1rem;">Replace <span class="highlight">PATTERN</span> with your account pattern (e.g., ${accounts[0].pattern})</p>

                    <div class="success">
                        <div class="success-title">🎉 Setup Complete!</div>
                        <p>You're all set! Your Git hooks will automatically manage your identity:</p>
                        <ul style="margin-top: 0.5rem;">
                            <li><strong>post-checkout</strong> - Sets identity when cloning or switching branches</li>
                            <li><strong>pre-commit</strong> - Ensures correct identity before commits</li>
                            <li><strong>pre-push</strong> - Final check before pushing</li>
                        </ul>
                    </div>
                </div>

                <div class="guide-section">
                    <h2>Troubleshooting</h2>

                    <h3>Hook not running?</h3>
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">Check hooks path</span>
                            <button class="copy-btn" onclick='copyCode(this, \`git config --global core.hooksPath\`)'>Copy</button>
                        </div>
                        <pre>git config --global core.hooksPath</pre>
                    </div>

                    <h3>SSH key not working?</h3>
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">List added keys</span>
                            <button class="copy-btn" onclick='copyCode(this, \`ssh-add -l\`)'>Copy</button>
                        </div>
                        <pre>ssh-add -l</pre>
                    </div>

                    <h3>Wrong user config?</h3>
                    ${os === 'windows' ? `
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">Check current config (PowerShell)</span>
                            <button class="copy-btn" onclick='copyCode(this, \`git config --list --show-origin | Select-String user\`)'>Copy</button>
                        </div>
                        <pre>git config --list --show-origin | Select-String user</pre>
                    </div>
                    ` : `
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-label">Check current config</span>
                            <button class="copy-btn" onclick='copyCode(this, \`git config --list --show-origin | grep user\`)'>Copy</button>
                        </div>
                        <pre>git config --list --show-origin | grep user</pre>
                    </div>
                    `}
                </div>
            `;

    document.getElementById('output').innerHTML = guide;
    document.getElementById('output').classList.add('visible');
    document.getElementById('output').scrollIntoView({ behavior: 'smooth' });
}