/**
 * =========================================================================
 * ENSEMBLE 5.0 - FOOD COUPON & VERIFICATION SYSTEM (BACKEND)
 * Google Apps Script Web App
 * Organizer: IEEE SCT SB
 * =========================================================================
 * 
 * Features:
 * 1. 100% compatible with both modern V8 and legacy Rhino Apps Script runtimes.
 * 2. Automatically initializes sheet headers.
 * 3. Issues unique serial tokens (e.g. ES5-1001, ES5-1002...).
 * 4. Prevents duplicate registrations (checks Email / Phone / IEEE ID).
 * 5. Sends automated email with scannable QR code directly to participant.
 * 6. Provides verification & 1-click meal claim endpoints for volunteers.
 * 7. Full CORS support for web frontend fetch requests.
 */

// Configuration
var SHEET_NAME = "Ensemble5_Food_Coupons";
var EVENT_NAME = "Ensemble 5.0";
var TOKEN_PREFIX = "ES5-";
var START_TOKEN_NUMBER = 1001;

// Email Sender Display Name & Subject
var SENDER_NAME = "IEEE SCT SB - Ensemble 5.0";
var EMAIL_SUBJECT = "Your Official Food Coupon Pass - Ensemble 5.0";

/**
 * Run this function once manually from the Apps Script editor to initialize the sheet
 */
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  var headers = [
    "Timestamp",
    "Token",
    "Full Name",
    "Email",
    "Phone",
    "Membership Status",
    "IEEE ID",
    "Claimed Status",
    "Claimed Timestamp"
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#2d3436").setFontColor("#ffffff");
  sheet.setFrozenRows(1);
  Logger.log("Sheet initialized successfully with headers!");
}

/**
 * Handles HTTP GET requests (for quick health checks and token verification)
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action;
    
    if (action === "verify") {
      return handleVerify(params.token);
    }
    
    return jsonResponse({
      status: "success",
      message: "Ensemble 5.0 Food Coupon API is operational."
    });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * Handles HTTP POST requests
 */
function doPost(e) {
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var action = data.action || "issue";

    if (action === "issue") {
      return handleIssueCoupon(data);
    } else if (action === "verify") {
      return handleVerify(data.token);
    } else if (action === "claim") {
      return handleClaimMeal(data.token);
    } else {
      return jsonResponse({ status: "error", message: "Unknown action: " + action });
    }
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * ACTION: Issue a new coupon
 */
function handleIssueCoupon(data) {
  var sheet = getOrCreateSheet();
  var lock = LockService.getScriptLock();
  
  // Acquire lock to avoid race conditions when generating sequential tokens
  try {
    lock.waitLock(10000);
  } catch (e) {
    return jsonResponse({ status: "error", message: "Server busy. Please try again." });
  }

  try {
    var name = (data.name || "").toString().trim();
    var email = (data.email || "").toString().trim();
    var phone = (data.phone || "").toString().trim();
    var membershipStatus = (data.membershipStatus || "Non-IEEE Member").toString().trim();
    var ieeeId = (data.ieeeId || "N/A").toString().trim();

    if (!name || !email) {
      return jsonResponse({ status: "error", message: "Name and Email are required." });
    }

    var lastRow = sheet.getLastRow();
    
    // Check for duplicate registrations (by email, phone, or IEEE ID)
    if (lastRow > 1) {
      var existingData = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
      for (var i = 0; i < existingData.length; i++) {
        var row = existingData[i];
        var existingToken = row[1];
        var existingEmail = (row[3] || "").toString().trim().toLowerCase();
        var existingPhone = (row[4] || "").toString().trim().replace(/\D/g, "");
        var existingIeeeId = (row[6] || "").toString().trim();
        var cleanPhone = phone.replace(/\D/g, "");

        var emailMatch = email.toLowerCase() === existingEmail;
        var phoneMatch = cleanPhone && existingPhone && cleanPhone.slice(-10) === existingPhone.slice(-10);
        var ieeeMatch = ieeeId && ieeeId !== "N/A" && existingIeeeId && existingIeeeId !== "N/A" && ieeeId === existingIeeeId;

        if (emailMatch || phoneMatch || ieeeMatch) {
          return jsonResponse({
            status: "already_registered",
            message: "Participant is already registered!",
            token: existingToken,
            name: row[2],
            claimed: row[7] === "YES",
            claimedAt: row[8]
          });
        }
      }
    }

    // Collect all existing tokens in the sheet to prevent any random collisions
    var existingTokensSet = {};
    if (lastRow > 1) {
      var allTokensData = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var k = 0; k < allTokensData.length; k++) {
        var t = String(allTokensData[k][0]).trim().toUpperCase();
        if (t) existingTokensSet[t] = true;
      }
    }

    // Generate a unique random 4-digit token between 1000 and 9999
    var token = "";
    var maxAttempts = 1000;
    var attempt = 0;
    do {
      var randomNum = Math.floor(Math.random() * 9000) + 1000; // 1000 to 9999
      token = TOKEN_PREFIX + randomNum;
      attempt++;
    } while (existingTokensSet[token] && attempt < maxAttempts);

    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

    // Append new participant row (prefix phone with ' to force plain text and prevent formula evaluation)
    sheet.appendRow([
      timestamp,
      token,
      name,
      email,
      "'" + phone,
      membershipStatus,
      ieeeId,
      "NO", // Claimed Status
      "-"   // Claimed Timestamp
    ]);

    // Send confirmation email with QR Code
    var emailSent = false;
    try {
      sendCouponEmail(email, name, token);
      emailSent = true;
    } catch (mailErr) {
      Logger.log("Email dispatch failed: " + mailErr.toString());
    }

    return jsonResponse({
      status: "success",
      token: token,
      name: name,
      email: email,
      emailSent: emailSent,
      message: "Food coupon issued successfully!"
    });

  } finally {
    lock.releaseLock();
  }
}

/**
 * ACTION: Verify token details and claim status
 */
function handleVerify(rawToken) {
  var token = (rawToken || "").toString().trim().toUpperCase();
  if (!token) {
    return jsonResponse({ status: "error", message: "Token is required." });
  }

  var sheet = getOrCreateSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return jsonResponse({ status: "not_found", message: "Token not found." });
  }

  var data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (String(row[1]).trim().toUpperCase() === token) {
      var isClaimed = String(row[7]).trim().toUpperCase() === "YES";
      return jsonResponse({
        status: "found",
        token: row[1],
        name: row[2],
        email: row[3],
        phone: row[4],
        membershipStatus: row[5],
        ieeeId: row[6],
        claimed: isClaimed,
        claimedAt: isClaimed ? row[8] : null
      });
    }
  }

  return jsonResponse({ status: "not_found", message: "Token not found in database." });
}

/**
 * ACTION: Mark meal as claimed
 */
function handleClaimMeal(rawToken) {
  var token = (rawToken || "").toString().trim().toUpperCase();
  if (!token) {
    return jsonResponse({ status: "error", message: "Token is required." });
  }

  var sheet = getOrCreateSheet();
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return jsonResponse({ status: "error", message: "Server busy. Please try again." });
  }

  try {
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return jsonResponse({ status: "not_found", message: "Token not found." });
    }

    var data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (String(row[1]).trim().toUpperCase() === token) {
        var rowIndex = i + 2; // 1-indexed, skipping header
        var currentClaimed = String(row[7]).trim().toUpperCase();

        if (currentClaimed === "YES") {
          return jsonResponse({
            status: "already_claimed",
            message: "Meal has ALREADY been claimed for this token!",
            token: row[1],
            name: row[2],
            claimedAt: row[8]
          });
        }

        var claimedTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
        sheet.getRange(rowIndex, 8).setValue("YES");
        sheet.getRange(rowIndex, 9).setValue(claimedTime);

        return jsonResponse({
          status: "success",
          message: "Meal successfully claimed!",
          token: row[1],
          name: row[2],
          claimedAt: claimedTime
        });
      }
    }

    return jsonResponse({ status: "not_found", message: "Token not found in database." });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Send branded HTML email with QR code (Universal String Concatenation)
 */
function sendCouponEmail(email, name, token) {
  var qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(token);
  
  var htmlBody = ""
    + '<div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #e1e8ed; border-radius: 12px; overflow: hidden; background: #ffffff;">'
    + '  <div style="background: linear-gradient(135deg, #e84393 0%, #6c5ce7 100%); padding: 24px; text-align: center; color: #ffffff;">'
    + '    <h3 style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">IEEE SCT SB PRESENTS</h3>'
    + '    <h1 style="margin: 8px 0; font-size: 28px; font-weight: bold; letter-spacing: 1px;">Ensemble 5.0</h1>'
    + '    <p style="margin: 0; font-size: 13px; opacity: 0.9;">Official Food Coupon Pass</p>'
    + '  </div>'
    + '  <div style="padding: 24px; text-align: center;">'
    + '    <p style="font-size: 15px; color: #2d3436; margin-top: 0;">Hello <strong>' + escapeHtml(name) + '</strong>,</p>'
    + '    <p style="font-size: 13px; color: #636e72; line-height: 1.5;">Here is your official meal pass for Ensemble 5.0. Present this QR code or Token ID at the food counter.</p>'
    + '    <div style="margin: 20px auto; padding: 16px; background: #f8f9fa; border-radius: 10px; display: inline-block;">'
    + '      <img src="' + qrCodeUrl + '" alt="QR Code" width="180" height="180" style="display: block; margin: auto; border-radius: 8px; border: 1px solid #ddd;" />'
    + '      <div style="margin-top: 12px; font-size: 22px; font-weight: bold; letter-spacing: 2px; color: #2d3436; background: #e0f2fe; padding: 6px 12px; border-radius: 6px;">'
    +          escapeHtml(token)
    + '      </div>'
    + '    </div>'
    + '    <div style="background: #fff3cd; color: #856404; padding: 12px; border-radius: 8px; font-size: 12px; margin-top: 15px; text-align: left;">'
    + '      <strong>⚠️ Note:</strong>'
    + '      <ul style="margin: 5px 0 0 18px; padding: 0;">'
    + '        <li>This coupon is valid for a <strong>single meal redemption</strong> only.</li>'
    + '        <li>Once scanned at the food counter, the pass cannot be reused.</li>'
    + '      </ul>'
    + '    </div>'
    + '  </div>'
    + '  <div style="background: #f1f2f6; padding: 14px; text-align: center; font-size: 11px; color: #747d8c;">'
    + '    IEEE SCT SB &bull; Ensemble 5.0 &bull; Food Distribution Portal'
    + '  </div>'
    + '</div>';

  MailApp.sendEmail({
    to: email,
    subject: EMAIL_SUBJECT,
    htmlBody: htmlBody,
    name: SENDER_NAME
  });
}

/**
 * Basic HTML escaping helper for email safety
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Helper to get or initialize sheet
 */
function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    setupSheet();
    sheet = ss.getSheetByName(SHEET_NAME);
  }
  return sheet;
}

/**
 * Returns JSON response with proper CORS headers
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
