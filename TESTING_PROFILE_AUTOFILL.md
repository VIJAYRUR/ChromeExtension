# 🧪 Testing Profile-Based Autofill

## Quick Test (5 Minutes)

### Step 1: Reload Extension

```bash
1. Open Chrome
2. Go to: chrome://extensions/
3. Find "LinkedIn Jobs Filter & Tracker"
4. Click Reload (🔄) button
5. ✅ Extension reloaded
```

### Step 2: Set Up Test Profile

```bash
1. Go to any website (e.g., google.com)
2. Click the "📝 Autofill" button (bottom-right corner)
3. Click "⚙️ Set Up Profile" button
4. New tab opens with profile form
```

**Fill in test data**:

**Step 1 - Personal Info**:
- First Name: `John`
- Last Name: `Doe`
- Preferred Name: `Johnny` (optional)

**Step 2 - Contact Info**:
- Email: `john.doe@example.com`
- Phone: `(555) 123-4567`
- Street Address: `123 Main Street`
- Apartment/Suite: `Apt 4B` (optional)
- City: `San Francisco`
- State: `CA`
- ZIP Code: `94102`
- Country: `United States`
- LinkedIn: `https://linkedin.com/in/johndoe`
- GitHub: `https://github.com/johndoe` (optional)
- Website: `https://johndoe.com` (optional)

**Step 3 - Work Experience**:
- Current/Most Recent Company: `Tech Corp`
- Current/Most Recent Job Title: `Software Engineer`
- Years of Experience: `5`
- Skills: `JavaScript, Python, React, Node.js, AWS`

**Step 4 - Education**:
- University/College: `Stanford University`
- Degree: `Bachelor's Degree`
- Major: `Computer Science`
- Graduation Year: `2018`
- GPA: `3.8` (optional)

**Step 5 - Legal & Additional**:
- Work Authorization: `U.S. Citizen`
- Require Sponsorship: `No`
- Veteran Status: `Not a Veteran` (optional)
- Disability Status: `Prefer not to answer` (optional)
- Gender: `Prefer not to answer` (optional)
- Ethnicity: `Prefer not to answer` (optional)
- Desired Salary: `$120,000` (optional)
- Available Start Date: `2024-02-01` (optional)
- Cover Letter: (optional)
```
Dear Hiring Manager,

I am excited to apply for this position. With 5 years of experience in software engineering, I believe I would be a great fit for your team.

Best regards,
John Doe
```

**Click "💾 Save Profile"**

✅ Success message should appear!

### Step 3: Test Autofill on Real Form

**Option A: Greenhouse Test Form**
```bash
1. Go to: https://boards.greenhouse.io/embed/job_app?for=example
2. Click "📝 Autofill" button
3. Click "✨ Autofill Form"
4. ✅ Verify fields are filled
```

**Option B: Lever Test Form**
```bash
1. Go to: https://jobs.lever.co/example
2. Click "📝 Autofill" button
3. Click "✨ Autofill Form"
4. ✅ Verify fields are filled
```

**Option C: Generic HTML Form**
```bash
1. Create test.html with this content:
```

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Form</title>
</head>
<body>
  <h1>Job Application Form</h1>
  <form>
    <label>First Name:</label>
    <input type="text" name="firstName" id="firstName"><br><br>
    
    <label>Last Name:</label>
    <input type="text" name="lastName" id="lastName"><br><br>
    
    <label>Email:</label>
    <input type="email" name="email" id="email"><br><br>
    
    <label>Phone:</label>
    <input type="tel" name="phone" id="phone"><br><br>
    
    <label>LinkedIn:</label>
    <input type="url" name="linkedin" id="linkedin"><br><br>
    
    <label>City:</label>
    <input type="text" name="city" id="city"><br><br>
    
    <label>State:</label>
    <input type="text" name="state" id="state"><br><br>
    
    <label>Years of Experience:</label>
    <input type="number" name="yearsOfExperience" id="yearsOfExperience"><br><br>
    
    <button type="submit">Submit</button>
  </form>
</body>
</html>
```

```bash
2. Open test.html in Chrome
3. Click "📝 Autofill" button
4. Click "✨ Autofill Form"
5. ✅ All fields should be filled!
```

### Step 4: Test Profile Editing

```bash
1. Click "📝 Autofill" button
2. Click "✏️ Edit Profile"
3. Change some fields (e.g., phone number)
4. Click "💾 Save Profile"
5. Test autofill again
6. ✅ Verify new data is used
```

### Step 5: Test Profile Clearing

```bash
1. Click "📝 Autofill" button
2. Click "🗑️ Clear" button
3. Confirm deletion
4. ✅ Profile should be cleared
5. "⚙️ Set Up Profile" button should appear again
```

---

## ✅ What to Verify

### Profile Setup Page:
- [ ] Page opens in new tab
- [ ] All 5 steps visible in progress bar
- [ ] Can navigate between steps
- [ ] Required fields validated
- [ ] Can't proceed without required fields
- [ ] Success message shows after save
- [ ] Can close tab after save

### Autofill Panel:
- [ ] Shows "No profile set up" initially
- [ ] "⚙️ Set Up Profile" button works
- [ ] After setup, shows profile info (name, email, phone)
- [ ] "✏️ Edit Profile" button appears after setup
- [ ] "✨ Autofill Form" button enabled after setup
- [ ] "🗑️ Clear" button works

### Autofill Functionality:
- [ ] Fills first name correctly
- [ ] Fills last name correctly
- [ ] Fills email correctly
- [ ] Fills phone correctly
- [ ] Fills address fields correctly
- [ ] Fills LinkedIn URL correctly
- [ ] Fills work experience fields
- [ ] Fills education fields
- [ ] Fills legal/authorization fields
- [ ] Shows success notification after autofill

### Edge Cases:
- [ ] Works on different platforms (Greenhouse, Lever, etc.)
- [ ] Handles missing optional fields gracefully
- [ ] Doesn't break on forms with unusual field names
- [ ] Profile persists after browser restart
- [ ] Draft auto-saves while filling form

---

## 🐛 Common Issues & Fixes

### Issue: Profile setup page doesn't open
**Fix**: Check console for errors, reload extension

### Issue: Autofill button doesn't appear
**Fix**: Make sure you're on a page with a form

### Issue: Fields not filling
**Fix**: Check console logs, verify field detection

### Issue: Profile not saving
**Fix**: Check Chrome storage permissions

### Issue: Old resume data still showing
**Fix**: Clear Chrome storage: `chrome.storage.local.clear()`

---

## 📊 Expected Results

After successful test:

✅ Profile setup takes ~3 minutes
✅ Autofill takes <5 seconds
✅ 90%+ of fields filled correctly
✅ No console errors
✅ Profile persists across sessions
✅ Edit/clear functions work

---

## 🎉 Success!

If all tests pass, you're ready to use the profile-based autofill system!

**Next Steps**:
1. Set up your real profile
2. Start applying to jobs
3. Save 10-15 minutes per application!

