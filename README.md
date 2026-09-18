# Ensemble 5.0 – Volunteer Food Coupon & Verification Portal

This project is a zero-hosting, web-based food coupon and verification system created for **IEEE SCT SB** to manage participant meal distributions for **Ensemble 5.0**.

The system is designed for **event volunteers** to rapidly issue digital meal passes at the registration desk and verify redemptions in real-time at the food counter using QR codes.

---

## Key Features

- **Dual Volunteer Modes:**
  - **Issue Coupon Mode:** Rapid attendee data entry, auto-token generation (`ES5-XXXX`), automated email dispatch with embedded QR code, and instant 1-click form reset.
  - **Scan & Verify Mode:** Built-in mobile camera QR scanner and manual token search to check meal claim status in real-time.
- **Zero-Hosting Database:** Powered by **Google Sheets** and **Google Apps Script** (100% free, zero server cost).
- **Fraud & Duplicate Prevention:**
  - Duplicate registration checks by Email, Phone, and IEEE Member ID.
  - Single-redemption guarantee (marks `Claimed Status = YES` with timestamp in Google Sheets upon counter scan).
  - Prominent red alerts if a participant attempts to reuse a coupon or screenshot.
- **Automated Email Dispatch:** Sends an official IEEE SCT SB branded confirmation email containing the scannable QR code pass to the participant's inbox.
- **Offline / Demo Mode:** Built-in simulation toggle to test the full issuing and verification workflow without needing a live backend connection.

---

## Setup & Deployment

Refer to [`SETUP_GUIDE.md`](./SETUP_GUIDE.md) for full instructions on setting up the Google Sheet, deploying the Apps Script (`google-apps-script/Code.gs`), and connecting the portal.

---

## Technology Stack

- **Frontend:** HTML5, Vanilla CSS3 (Custom Glassmorphism Design System), JavaScript (ES6+), Bootstrap 5.3
- **Libraries:** FontAwesome 6, QRCode.js (client-side QR generator), HTML5-QRCode (camera QR scanner)
- **Backend & Database:** Google Apps Script Web App, Google Sheets API, GmailApp

---

**Created for IEEE SCT SB – Ensemble 5.0**
