# Duplicate File Cleanup Instructions

## 📋 Overview
This toolkit helps you clean up duplicate files in your `C:\autonomous-elasticsearch-evolution-agent\sharedClientCache` directory.

## 🚀 Quick Start

### Option 1: Safe Preview Mode (Recommended First)
```cmd
cleanup-duplicates.bat -WhatIf
```
This shows what would be deleted without actually removing anything.

### Option 2: Interactive Mode
```cmd
cleanup-duplicates.bat
```
Will ask for confirmation before deleting files.

### Option 3: Force Mode (Use with caution)
```cmd
cleanup-duplicates.bat -Force
```
Deletes duplicates without confirmation.

## 🛠️ What the Script Does

1. **Analyzes all files** in the sharedClientCache directory
2. **Identifies duplicates** by:
   - File name patterns (UUID-based naming)
   - Content hashing (SHA256)
   - Modification timestamps
3. **Keeps the newest version** of each duplicate group
4. **Removes older duplicates** to free up space
5. **Cleans up empty directories** afterward

## 🔍 Example Output
```
🔍 Analyzing duplicate files in: C:\autonomous-elasticsearch-evolution-agent\sharedClientCache

📂 Scanning for files...
Found 357 files to analyze

🔍 Identifying duplicates...
📝 Found 5 versions of 'collab-hub.html':
  ❌ 1bdfd1ad-c6f1-4d8b-b3df-6e226005bcca__collab-hub.html (older version)
  ❌ 6105e406-3210-4f58-9126-5eb18b679d1a__collab-hub.html (older version)
  ❌ c90790a4-ac6a-4f20-9772-05844b0bdf84__collab-hub.html (older version)

📊 Summary:
Total files analyzed: 357
Duplicate groups found: 21
Files marked for deletion: 156

🗑️ Files to be deleted:
  C:\autonomous-elasticsearch-evolution-agent\sharedClientCache\cache\workingSpace\1bdfd1ad-c6f1-4d8b-b3df-6e226005bcca__collab-hub.html
    Reason: Duplicate content (keep newest)
    Keeping: C:\autonomous-elasticsearch-evolution-agent\sharedClientCache\cache\workingSpace\7d9ced87-6103-4cd5-9c19-865d184c106c__collab-hub.html
```

## ⚠️ Safety Features

- **WhatIf mode**: Preview without deleting
- **Confirmation prompts**: Interactive approval
- **Content-based detection**: Only removes true duplicates
- **Backup recommendation**: Consider backing up before running
- **Error handling**: Continues if individual deletions fail

## 📁 Files Included

- `cleanup-duplicates.ps1` - Main PowerShell script
- `cleanup-duplicates.bat` - Windows batch wrapper
- `README_CLEANUP.md` - This instruction file

## 🎯 When to Use

Run this cleanup when:
- Your sharedClientCache is taking up too much space
- You want to organize duplicate session files
- Preparing for a clean deployment
- Freeing up disk space

## 💡 Tips

1. **Always run with `-WhatIf` first** to see what will be deleted
2. **Keep backups** of important session data
3. **Run during low-usage periods** to avoid conflicts
4. **Monitor the output** to ensure correct files are targeted

## 🆘 Troubleshooting

If you encounter permission errors:
- Run Command Prompt as Administrator
- Check file permissions on the target directory
- Ensure no applications are actively using those files

If the script seems stuck:
- Press Ctrl+C to cancel
- Run with `-WhatIf` to diagnose the issue
- Check the target directory path is correct