# Ensemble 5.0 – Food Coupon & Verification System Setup Guide

This guide explains how to set up the **zero-cost, zero-hosting Google Sheets database** and backend for **Ensemble 5.0**.

---

## 1. Create the Google Sheet Database

1. Go to [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Rename the spreadsheet to:  
   `Ensemble 5.0 - Food Coupons`
3. Rename the first tab at the bottom to:  
   `Ensemble5_Food_Coupons`

*(Note: The script will also automatically create and format this tab if it doesn't already exist).*

---

## 2. Add the Backend Code

1. In the Google Sheet top menu, click:  
   **Extensions &rarr; Apps Script**
2. In the Apps Script code editor, delete any existing default code inside `Code.gs`.
3. Open [`google-apps-script/Code.gs`](file:///home/harinarayanans/Disk%20D%20Fake/ensemble4/ensemble4.0/google-apps-script/Code.gs) in this repository, copy all the code, and paste it into the editor.
4. Click the **Save** icon (disk icon or `Ctrl+S`).

---

## 3. Initialize the Sheet Headers

1. In the Apps Script editor, look at the toolbar dropdown next to the "Debug" button.
2. Select the function: **`setupSheet`**.
3. Click **Run**.
4. Google will ask for authorization on first run:
   - Click **Review permissions** &rarr; select your Google account.
   - Click **Advanced** &rarr; click **Go to Untitled project (unsafe)**.
   - Click **Allow**.
5. Switch back to your Google Sheet tab. You will see formatted header columns:
   - `Timestamp | Token | Full Name | Email | Phone | Membership Status | IEEE ID | Claimed Status | Claimed Timestamp`

---

## 4. Deploy as a Public Web App (Zero Hosting)

1. In the top right corner of the Apps Script editor, click **Deploy &rarr; New deployment**.
2. Click the gear icon (**Select type**) &rarr; select **Web app**.
3. Fill in the deployment details:
   - **Description:** `Ensemble 5.0 Food Coupon API`
   - **Execute as:** `Me (your_email@gmail.com)` *(Required so the script can write to your sheet and send emails)*
   - **Who has access:** `Anyone` *(Crucial! Must be "Anyone" so volunteer devices can send requests without needing Google sign-in)*
4. Click **Deploy**.
5. Copy the **Web App URL** generated (it will look like:  
   `https://script.google.com/macros/s/AKfy.../exec`).

> [!IMPORTANT]
> Whenever you make code changes to `Code.gs` in the future, always do:  
> **Deploy &rarr; Manage deployments &rarr; Edit &rarr; New version &rarr; Deploy**.

---

## 5. Connect the Frontend

1. Open [`index.html`](file:///home/harinarayanans/Disk%20D%20Fake/ensemble4/ensemble4.0/index.html) in your browser.
2. Click the **Backend Setup** link in the top-right corner of the portal.
3. Paste your copied Google Apps Script Web App URL into the input field.
4. Click **Save Configuration**.
5. Done! The portal is now connected directly to your Google Sheet.

---

## 6. How Volunteers Use the System

### A. Desk Volunteers ("Issue Coupon" Tab)
1. Enter the attendee's details: **Name, Email, Phone**.
2. Select **IEEE Member** or **Non-IEEE Member** (IEEE ID appears only when IEEE Member is selected).
3. Click **Issue Food Coupon** (or press Enter).
4. The system:
   - Records the registration in the Google Sheet.
   - Assigns a sequential token (e.g. `ES5-1001`).
   - Automatically sends an official email with an embedded scannable QR code to the attendee's email.
   - Displays the digital ticket with the QR code on screen.
5. Click **Issue Next Coupon** (or press `Enter`) to immediately reset the form and focus back on the name field for the next person in line.

### B. Food Counter Volunteers ("Scan & Verify" Tab)
1. Click **Start Camera Scanner** to scan the attendee's QR code from their phone (or type the token `ES5-1001` manually in the search box).
2. The system checks Google Sheets in real-time:
   - **Green Badge (VALID - NOT CLAIMED):** Shows attendee name & details. Volunteer clicks **"Redeem / Claim Meal"**. Google Sheets marks `Claimed = YES` and records the exact time.
   - **Red Badge (ALREADY CLAIMED):** Shows duplicate warning with the exact time it was previously redeemed.
   - **Yellow Badge (NOT FOUND):** Invalid or counterfeit token.
