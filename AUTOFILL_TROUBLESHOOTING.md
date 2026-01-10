# 🔧 Autofill Troubleshooting Guide

## Issue: Autofill Button Not Appearing

### ✅ **FIXED: URL Pattern Matching**

**Problem**: The autofill button wasn't appearing on Greenhouse job boards because the URL pattern didn't match.

**Your URL**: `https://job-boards.greenhouse.io/speechify/jobs/5672022004`

**Original Pattern**: `https://*.greenhouse.io/*` ❌ (doesn't match `job-boards.greenhouse.io`)

**Fixed Patterns**: Added specific patterns:
- ✅ `https://boards.greenhouse.io/*`
- ✅ `https://job-boards.greenhouse.io/*`
- ✅ `https://jobs.lever.co/*`
- ✅ `https://*/*jobs/*`

---

## 🚀 How to Fix (Steps to Follow)

### Step 1: Reload the Extension

1. **Go to Chrome Extensions**
   ```
   chrome://extensions/
   ```

2. **Find "LinkedIn Jobs Filter & Tracker"**

3. **Click the Reload button** (circular arrow icon)
   - This reloads the extension with the new manifest.json

4. **Verify it says "Errors" = 0**

### Step 2: Refresh the Job Application Page

1. **Go back to the Greenhouse page**
   ```
   https://job-boards.greenhouse.io/speechify/jobs/5672022004
   ```

2. **Hard refresh the page**
   - Mac: `Cmd + Shift + R`
   - Windows: `Ctrl + Shift + R`

3. **Look for the floating button** (bottom-right corner)
   - Should see: **"📝 Autofill"** button

### Step 3: Check Console (If Still Not Working)

1. **Open Developer Console**
   - Mac: `Cmd + Option + J`
   - Windows: `Ctrl + Shift + J`

2. **Look for autofill logs**
   ```
   [Autofill UI] 🚀 Initializing on job-boards.greenhouse.io
   [Autofill UI] ✅ Job application page detected!
   ```

3. **If you see errors**, check:
   - Are the script files loading?
   - Any JavaScript errors?
   - Network tab shows 404s?

---

## 🔍 Debugging Checklist

### ✅ Extension Loaded
- [ ] Extension appears in `chrome://extensions/`
- [ ] Extension is **enabled** (toggle is ON)
- [ ] No errors shown
- [ ] Version shows 2.0.0

### ✅ Files Present
- [ ] `resume-manager.js` exists
- [ ] `autofill-engine.js` exists
- [ ] `autofill-content.js` exists
- [ ] `manifest.json` updated

### ✅ URL Matches
- [ ] Current URL contains `greenhouse.io` OR
- [ ] Current URL contains `/jobs/` OR
- [ ] Current URL contains `/apply` OR
- [ ] Current URL contains `/application`

### ✅ Page Detection
- [ ] Page has form elements
- [ ] Page has input fields
- [ ] Page is fully loaded

---

## 🧪 Test on Different Platforms

### Greenhouse (Your Current Page)
```
https://job-boards.greenhouse.io/speechify/jobs/5672022004
```
**Expected**: ✅ Autofill button should appear

### Workday Example
```
https://amazon.jobs/en/jobs/2408098/software-development-engineer
(Redirects to myworkdayjobs.com)
```
**Expected**: ✅ Autofill button should appear

### Lever Example
```
https://jobs.lever.co/netflix/
```
**Expected**: ✅ Autofill button should appear

---

## 🐛 Common Issues & Solutions

### Issue 1: Button Still Not Appearing

**Possible Causes**:
1. Extension not reloaded
2. Page not refreshed
3. Content scripts blocked
4. JavaScript errors

**Solutions**:
1. **Reload extension** in `chrome://extensions/`
2. **Hard refresh page** (Cmd+Shift+R)
3. **Check console** for errors
4. **Try incognito mode** (allow extension in incognito)

### Issue 2: Console Shows "Not a job application page"

**Possible Causes**:
- URL doesn't match patterns
- Page structure not recognized

**Solutions**:
1. Check if URL contains:
   - `greenhouse.io`
   - `/jobs/`
   - `/apply`
   - `/application`
2. If not, the page might not be detected
3. Check console logs for detection logic

### Issue 3: Scripts Not Loading

**Possible Causes**:
- Files missing
- Manifest syntax error
- Chrome cache

**Solutions**:
1. **Verify files exist**:
   ```bash
   ls -la resume-manager.js
   ls -la autofill-engine.js
   ls -la autofill-content.js
   ```

2. **Check manifest.json** is valid JSON
   - Use JSON validator
   - Check for syntax errors

3. **Clear Chrome cache**:
   - Settings → Privacy → Clear browsing data
   - Check "Cached images and files"

### Issue 4: Button Appears But Doesn't Work

**Possible Causes**:
- Resume manager not loaded
- Autofill engine not initialized
- Storage permissions missing

**Solutions**:
1. **Check console** for initialization logs
2. **Verify storage permission** in manifest.json
3. **Try uploading resume** and check for errors

---

## 📊 Expected Console Output

When everything works correctly, you should see:

```javascript
[Autofill UI] 🚀 Initializing on job-boards.greenhouse.io
[Autofill UI] ✅ Job application page detected!
[Platform Detector] Detected platform: Greenhouse
```

After uploading resume:
```javascript
[Resume Manager] 📄 Parsing PDF...
[Resume Manager] ✅ Extracted name: John Doe
[Resume Manager] ✅ Extracted email: john@example.com
[Resume Manager] ✅ Resume data saved
```

After clicking autofill:
```javascript
[Autofill Engine] 🚀 Starting autofill...
[Autofill Engine] 📝 Found 15 fields to fill
[Autofill Engine] ✅ Filled: First Name
[Autofill Engine] ✅ Filled: Last Name
[Autofill Engine] ✅ Filled: Email
...
[Autofill Engine] ✅ Autofilled 15 fields successfully!
```

---

## 🔧 Manual Testing Steps

### Test 1: Extension Loading
```bash
1. Open chrome://extensions/
2. Find "LinkedIn Jobs Filter & Tracker"
3. Click "Reload"
4. Check for errors (should be 0)
```

### Test 2: Content Script Injection
```bash
1. Go to: https://job-boards.greenhouse.io/speechify/jobs/5672022004
2. Open Console (Cmd+Option+J)
3. Type: window.autofillEngine
4. Should see: Object (not undefined)
```

### Test 3: Button Visibility
```bash
1. Look at bottom-right corner
2. Should see black button: "📝 Autofill"
3. Hover over it (should scale up)
4. Click it (panel should slide in)
```

### Test 4: Resume Upload
```bash
1. Click "📝 Autofill" button
2. Click "Upload Resume (PDF)"
3. Select a PDF file
4. Wait 2-5 seconds
5. Should see your name appear
```

### Test 5: Form Autofill
```bash
1. Click "✨ Autofill Form"
2. Watch fields fill automatically
3. Should see notification: "✅ Autofilled X fields"
4. Verify data in form fields
```

---

## 🚨 Emergency Reset

If nothing works, try a complete reset:

### Step 1: Remove Extension
```bash
1. Go to chrome://extensions/
2. Click "Remove" on the extension
3. Confirm removal
```

### Step 2: Clear Chrome Data
```bash
1. Settings → Privacy → Clear browsing data
2. Select "All time"
3. Check: Cookies, Cache, Site data
4. Click "Clear data"
```

### Step 3: Reload Extension
```bash
1. Go to chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select ChromeExtension folder
5. Verify no errors
```

### Step 4: Test Again
```bash
1. Go to Greenhouse page
2. Hard refresh (Cmd+Shift+R)
3. Look for autofill button
```

---

## 📞 Still Not Working?

### Check These Files

1. **manifest.json** - Lines 20-37 should have:
   ```json
   "matches": [
     "https://*.greenhouse.io/*",
     "https://boards.greenhouse.io/*",
     "https://job-boards.greenhouse.io/*",
     ...
   ]
   ```

2. **autofill-content.js** - Line 66 should have:
   ```javascript
   if (atsPatterns.some(pattern => hostname.includes(pattern))) {
     return true;
   }
   ```

3. **Console logs** - Should show initialization

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Black "📝 Autofill" button appears (bottom-right)
- ✅ Console shows "[Autofill UI] ✅ Job application page detected!"
- ✅ Clicking button opens side panel
- ✅ Can upload resume successfully
- ✅ Autofill button fills form fields

---

**After following these steps, the autofill should work on your Greenhouse page!** 🎉

