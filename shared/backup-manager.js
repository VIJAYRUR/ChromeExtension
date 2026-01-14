// Backup Manager - Export/Import all extension data

class BackupManager {
  constructor() {
    this.version = '2.1.0';
  }

  // Export all data to JSON file
  async exportAllData() {
    try {
      console.log('[Backup] 📦 Exporting all data...');

      // Get all data from chrome.storage
      const data = await chrome.storage.local.get(null);

      // Create backup object
      const backup = {
        version: this.version,
        exportDate: new Date().toISOString(),
        data: data
      };

      // Convert to JSON
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const filename = `job-tracker-backup-${this.getDateString()}.json`;
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();

      // Cleanup
      URL.revokeObjectURL(url);

      console.log('[Backup] ✅ Data exported:', filename);
      return { success: true, filename };

    } catch (error) {
      console.error('[Backup] ❌ Export failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Import data from JSON file
  async importData(file, mode = 'replace') {
    try {
      console.log('[Backup] 📥 Importing data from:', file.name);

      // Read file
      const text = await file.text();

      // Parse JSON
      let backup;
      try {
        backup = JSON.parse(text);
      } catch (parseError) {
        console.error('[Backup] ❌ JSON parse error:', parseError);
        throw new Error('File is not valid JSON. Please select a valid backup file.');
      }

      console.log('[Backup] 📦 Parsed backup:', backup);

      // Validate backup structure
      // Support both new format (with version/data) and old format (direct data)
      let dataToSave;

      if (backup.version && backup.data) {
        // New format: { version: "2.1.0", exportDate: "...", data: {...} }
        console.log('[Backup] 📋 Backup version:', backup.version);
        console.log('[Backup] 📅 Backup date:', backup.exportDate);
        dataToSave = backup.data;
      } else if (backup.trackedJobs || backup.userProfile || backup.settings) {
        // Old format or direct data: { trackedJobs: [...], userProfile: {...}, ... }
        console.log('[Backup] 📋 Legacy format detected');
        dataToSave = backup;
      } else {
        // Invalid format
        console.error('[Backup] ❌ Invalid backup structure:', Object.keys(backup));
        throw new Error(
          'Invalid backup file format.\n\n' +
          'Expected keys: trackedJobs, userProfile, or settings\n' +
          'Found keys: ' + Object.keys(backup).join(', ')
        );
      }

      console.log('[Backup] 📊 Data to import:', {
        hasJobs: !!dataToSave.trackedJobs,
        jobCount: dataToSave.trackedJobs?.length || 0,
        hasProfile: !!dataToSave.userProfile,
        hasSettings: !!dataToSave.settings,
        allKeys: Object.keys(dataToSave)
      });

      // Merge mode (if requested)
      if (mode === 'merge') {
        const currentData = await chrome.storage.local.get(null);

        // Merge tracked jobs
        if (dataToSave.trackedJobs && currentData.trackedJobs) {
          const mergedJobs = this.mergeJobs(
            currentData.trackedJobs,
            dataToSave.trackedJobs
          );
          dataToSave.trackedJobs = mergedJobs;
        }

        // Keep current settings if not in backup
        if (!dataToSave.settings && currentData.settings) {
          dataToSave.settings = currentData.settings;
        }
      }

      // Save to storage
      console.log('[Backup] 💾 Clearing storage...');
      await chrome.storage.local.clear();

      console.log('[Backup] 💾 Saving data...');
      await chrome.storage.local.set(dataToSave);

      console.log('[Backup] ✅ Data imported successfully');
      return {
        success: true,
        jobCount: dataToSave.trackedJobs?.length || 0,
        hasProfile: !!dataToSave.userProfile
      };

    } catch (error) {
      console.error('[Backup] ❌ Import failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Merge jobs (avoid duplicates)
  mergeJobs(currentJobs, importedJobs) {
    const merged = [...currentJobs];
    const existingIds = new Set(currentJobs.map(j => j.id));

    importedJobs.forEach(job => {
      if (!existingIds.has(job.id)) {
        merged.push(job);
      }
    });

    console.log(`[Backup] 🔀 Merged jobs: ${currentJobs.length} + ${importedJobs.length} = ${merged.length}`);
    return merged;
  }

  // Get formatted date string
  getDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}`;
  }

  // Get backup info (what's in storage)
  async getBackupInfo() {
    const data = await chrome.storage.local.get(null);
    
    return {
      hasProfile: !!data.userProfile,
      profileName: data.userProfile?.fullName || 'Not set',
      jobCount: data.trackedJobs?.length || 0,
      hasSettings: !!data.settings,
      storageSize: JSON.stringify(data).length
    };
  }
}

// Export
if (typeof window !== 'undefined') {
  window.BackupManager = BackupManager;
  window.backupManager = new BackupManager();
}

